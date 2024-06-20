import { ExecutionResult, GraphQLError } from 'graphql';
import getAtPath from 'lodash.get';
import setAtPath from 'lodash.set';
import { GatherPlan, GatherPlanResolver, OperationExport } from './gather.js';
import { Transport } from './transport.js';
import { assert, isRecord } from './utils.js';

export type SourceTransports = {
  [subgraph: string]: Transport;
};

export async function execute(
  transports: SourceTransports,
  plan: GatherPlan,
  operationVariables: Record<string, unknown>,
): Promise<
  ExecutionResult<Record<string, unknown>, { explain: ExecutionExplain[] }>
> {
  const resultRef: ExecutionResult = {};
  // TODO: batch resolvers going to the same subgraph
  const explain = await Promise.all(
    Object.entries(plan.operation.resolvers).map(([field, r]) =>
      executeResolver(
        transports,
        operationVariables,
        r,
        null,
        [field],
        resultRef,
      ),
    ),
  );
  return {
    ...resultRef,
    extensions: {
      // we dont spread resultRef.extensions because there wont be any
      explain,
    },
  };
}

export type ExecutionExplain = Omit<GatherPlanResolver, 'includes'> & {
  pathInData: (string | number)[];
  operation: string;
  variables: Record<string, unknown>;
  data?: unknown;
  errors?: ReadonlyArray<GraphQLError>;
  /** Resolved includes, if any. */
  includes?: ExecutionExplain[];
};

async function executeResolver(
  transports: SourceTransports,
  /**
   * The variables for the execution. Those that the user provides.
   * These should be used only on the operation (root) resolver.
   */
  operationVariables: Record<string, unknown>,
  /**
   * Resolver to execute.
   */
  resolver: GatherPlanResolver,
  /**
   * Data of the export in the parent resolver.
   */
  parentExportData: Record<string, unknown> | null,
  /**
   * The path in the {@link resultRef} data this gather is resolving.
   */
  pathInData: (string | number)[],
  /**
   * Reference whose object gets mutated to form the final
   * result (the one that the caller gets).
   */
  resultRef: ExecutionResult,
): Promise<ExecutionExplain> {
  const transport = transports[resolver.subgraph];
  if (!transport) {
    throw new Error(`Transport for subgraph "${resolver.subgraph}" not found`);
  }

  const variables = Object.values(resolver.variables).reduce(
    (agg, variable) => ({
      ...agg,
      [variable.name]:
        variable.kind === 'select'
          ? getAtPath(parentExportData, variable.select)
          : variable.kind === 'constant'
            ? variable.value
            : // variable.kind === 'user'
              operationVariables[variable.name],
    }),
    {},
  );

  const parentExportDataDoesntProvideAllSelectVariables = Object.values(
    resolver.variables,
  ).some(
    (variable) =>
      variable.kind === 'select' &&
      Object(variables)[variable.name] === undefined,
  );
  if (parentExportDataDoesntProvideAllSelectVariables) {
    // if parent's export data dont have all select variables
    // that means we're resolving a field of a non-existing
    // parent. this can happen with interfaces (see AccountsSpreadAdmin test in federation/simple-interface-object)
    // we therefore just set an empty object at the path, if there's
    // nothing set already
    if (resultRef.data && getAtPath(resultRef.data, pathInData) === undefined) {
      // TODO: should throw if resultRef's data is not available?
      setAtPath(resultRef.data, pathInData, {});
    }
    return resolver.kind === 'primitive'
      ? {
          ...resolver,
          pathInData,
          variables,
        }
      : {
          ...resolver,
          pathInData,
          variables,
          includes: [],
        };
  }

  const result = await transport.get({ query: resolver.operation, variables });

  if (result.errors?.length) {
    // stop immediately on errors, we cant traverse further
    resultRef.errors = [...(resultRef.errors || []), ...result.errors];
    return resolver.kind === 'primitive'
      ? {
          ...resolver,
          ...result,
          pathInData,
          variables,
        }
      : {
          ...resolver,
          ...result,
          pathInData,
          variables,
          includes: [],
        };
  } else if (!result.data) {
    // no error + no data is a no-no
    const err = new Error(
      'GraphQL execution result has no errors but does not contain data',
    );
    err.name = 'GraphQLExecutionNoData';
    throw err;
  }

  const exportData = getAtPath(result.data, resolver.pathToExportData);
  if (Array.isArray(exportData)) {
    for (let i = 0; i < exportData.length; i++) {
      const exportDataItem = exportData[i];
      console.log('populate', i + 1, '/', exportData.length);
      console.log('start', [...pathInData, i].join('.'));
      populateResultWithExportData(
        resolver,
        exportDataItem,
        [...pathInData, i],
        resultRef,
      );
    }
  } else {
    console.log('populate');
    populateResultWithExportData(resolver, exportData, pathInData, resultRef);
  }

  console.log(' < populated');

  return resolver.kind === 'primitive'
    ? {
        ...resolver,
        ...result,
        pathInData,
        variables,
        // scalar fields cannot have includes
      }
    : {
        ...resolver,
        ...result,
        pathInData,
        variables,
        // TODO: batch resolvers going to the same subgraph
        includes: await Promise.all(
          Object.entries(resolver.includes).flatMap(([field, resolver]) =>
            (Array.isArray(resolver) ? resolver : [resolver]).flatMap(
              (resolver) => {
                // if there's no field specified, we're resolving additional fields for the current one
                const resolvingAdditionalFields = field === '';

                if (Array.isArray(exportData)) {
                  // if the export data is an array, we need to gather resolve each item
                  return exportData.flatMap((exportData, i) => {
                    const fieldData = resolvingAdditionalFields
                      ? exportData
                      : getAtPath(exportData, field);
                    if (Array.isArray(fieldData)) {
                      // if the include points to an array, we need to gather resolve each item
                      return fieldData.map((fieldDataItem, j) =>
                        executeResolver(
                          transports,
                          operationVariables,
                          resolver,
                          fieldDataItem,
                          resolvingAdditionalFields
                            ? [...pathInData, i, j]
                            : [...pathInData, i, field, j],
                          resultRef,
                        ),
                      );
                    }
                    return executeResolver(
                      transports,
                      operationVariables,
                      resolver,
                      fieldData,
                      resolvingAdditionalFields
                        ? [...pathInData, i]
                        : [...pathInData, i, field],
                      resultRef,
                    );
                  });
                }

                const fieldData = resolvingAdditionalFields
                  ? exportData
                  : getAtPath(exportData, field);
                if (Array.isArray(fieldData)) {
                  // if the include points to an array, we need to gather resolve each item
                  return fieldData.map((fieldDataItem, i) =>
                    executeResolver(
                      transports,
                      operationVariables,
                      resolver,
                      fieldDataItem,
                      resolvingAdditionalFields
                        ? [...pathInData, i]
                        : [...pathInData, field, i],
                      resultRef,
                    ),
                  );
                }
                return executeResolver(
                  transports,
                  operationVariables,
                  resolver,
                  fieldData,
                  resolvingAdditionalFields
                    ? pathInData
                    : [...pathInData, field],
                  resultRef,
                );
              },
            ),
          ),
        ),
      };
}

/**
 * Sets each of the publicly exported fields of the composite resolver
 * to the result object reference.
 */
function populateResultWithExportData(
  resolver: GatherPlanResolver,
  exportData: unknown,
  /**
   * The path in the {@link resultRef} data this gather is resolving.
   */
  pathInData: (string | number)[],
  /**
   * Reference whose object gets mutated to form the final
   * result (the one that the caller gets).
   */
  resultRef: ExecutionResult,
) {
  /*

  similarAccounts.id_0 -> similarAccounts.id
    0 -> nothing
    1 -> "a1" (accounts.0.similarAccounts.1.id)

  similarAccounts.id_1 -> similarAccounts.id
    0 -> nothing
    1 -> nothing

  


  {
    accounts {
      ... on User {
        id                  # accounts.id
        name                # accounts.name   
        similarAccounts {   # accounts.similarAccounts
          ... on User {     # accounts.similarAccounts
            id              # accounts.similarAccounts.id
            name            # accounts.similarAccounts.name
          }
          ... on Admin {
            id_0: id        # accounts.similarAccounts.id
            name            # accounts.similarAccounts.name
          }
        }
      }
      ... on Admin {
        id_0: id            # accounts.id
        name                # accounts.name
        similarAccounts {   # accounts.similarAccounts
          ... on User {
            id              # accounts.similarAccounts.id
            name            # accounts.similarAccounts.name
          }
          ... on Admin {
            id_1: id        # accounts.similarAccounts.id
            name            # accounts.similarAccounts.name
          }
        }
      }
    }
  }
  
  */
  if (!resultRef.data) {
    // at this point, we're sure that there are no errors
    // so we can initialise the result data (if not already)
    resultRef.data = {};
  }

  if (resolver.kind === 'primitive') {
    // scalar fields are exported directly at the path in the result
    console.log('Setting (1)', pathInData.join('.'), 'to', exportData);
    setAtPath(resultRef.data, pathInData, exportData);
    return;
  }

  // We store a list of rewrites.
  // Each item has a path and a publicExportPath.
  const rewrites: Array<{
    // path in the export data
    from: string[];
    // path in the result data
    to: string[];
  }> = [];
  const publicExportPaths = resolver.exports.flatMap((p) =>
    getPublicPathsOfExport(p, rewrites),
  );

  if (!publicExportPaths.length && !rewrites.length) {
    for (const deepestObjectPath of resolver.exports.flatMap(
      getDeepestObjectPublicPathsOfExport,
    )) {
      // if there are no public export paths defined, we just want
      // to make the pathInData an object (because it's a composite resolver)
      // see [NOTE 1] in gather.ts for more info on why we perform no-export operations
      setAtPath(resultRef.data, [...pathInData, ...deepestObjectPath], {});
      // TODO: is there a case when we should include aliased fields here?
      //       Can they be the deepest field?
    }
    return;
  }

  let dataRef = pathInData.length
    ? getAtPath(resultRef.data, pathInData)
    : resultRef.data;

  if (dataRef === undefined) {
    dataRef = resultRef.data;
    for (let i = 0; i < pathInData.length; i++) {
      const key = pathInData[i];
      const nextKey = pathInData[i + 1];

      assert(key !== undefined, 'Expected key to be defined');

      if (dataRef[key] === undefined) {
        dataRef[key] = typeof nextKey === 'number' ? [] : {};
      }

      dataRef = dataRef[key];
    }
  }

  for (const exportPath of publicExportPaths) {
    populateResultChunkWithExportData(
      getExportAtPath(resolver.exports, exportPath),
      exportPath,
      exportData,
      dataRef,
    );
  }

  // for (const rewrite of rewrites) {
  //   assert(
  //     rewrite.to.length === rewrite.from.length,
  //     'Rewrite public export path and path should have the same length',
  //   );

  //   const importPath = rewrite.from;
  //   const exportPath = rewrite.to;

  //   console.log('From ', importPath);
  //   console.log('To   ', exportPath);

  //   const lastFromKey = importPath[importPath.length - 1];
  //   const lastToKey = exportPath[exportPath.length - 1];
  //   const valBeforeLast =
  //     importPath.length > 1
  //       ? getAtPath(exportData, importPath.slice(0, importPath.length - 1))
  //       : null;

  //   // console.log('before last p', importPath.slice(0, importPath.length - 1));
  //   // console.log('valBeforeLast', valBeforeLast);

  //   if (Array.isArray(valBeforeLast)) {
  //     // if we're exporting fields in an array, set for each item of the array
  //     for (let i = 0; i < valBeforeLast.length; i++) {
  //       // console.log(' ', i);
  //       // console.log('   value before last', valBeforeLast[i]);
  //       // console.log('   last key         ', lastFromKey);
  //       const value = getAtPath(valBeforeLast[i], [lastFromKey!]);

  //       if (value !== undefined) {
  //         console.log(
  //           ' Rewriting (3)',
  //           [
  //             ...pathInData,
  //             ...exportPath.slice(0, exportPath.length - 1)!,
  //             i,
  //             lastToKey!,
  //           ].join('.'),
  //           'to',
  //           value,
  //         );
  //         setAtPath(
  //           resultRef.data,
  //           [
  //             ...pathInData,
  //             ...exportPath.slice(0, exportPath.length - 1)!,
  //             i,
  //             lastToKey!,
  //           ],
  //           value,
  //         );
  //       } else {
  //         console.log(
  //           ' no value (3)',
  //           [
  //             ...pathInData,
  //             ...exportPath.slice(0, exportPath.length - 1)!,
  //             i,
  //             lastToKey!,
  //           ].join('.'),
  //         );
  //       }
  //     }
  //   } else {
  //     // otherwise, just set in object
  //     const value = getAtPath(exportData, importPath);
  //     console.log(JSON.stringify(exportData, null, 2));
  //     console.log('>  ', importPath);

  //     // if the value is undefined, we don't want to set it
  //     if (value !== undefined) {
  //       console.log(
  //         ' Rewriting (4)',
  //         [...pathInData, ...exportPath].join('.'),
  //         'to',
  //         value,
  //       );
  //       // setAtPath(resultRef.data, [...pathInData, ...exportPath], value);
  //     } else {
  //       console.log(' no value (4)');
  //     }
  //   }
  // }
}

/**
 * TODO: write tests
 *
 * Creates a list of paths to all public exports considering nested selections.
 *
 * For example, if {@link exp} is:
 * ```json
 * {
 *   "kind": "public",
 *   "name": "products",
 *   "prop": "products"
 *   "selections": [
 *     {
 *       "kind": "public",
 *       "name": "upc",
 *       "prop": "p"
 *     },
 *     {
 *       "kind": "public",
 *       "name": "manufacturer",
 *       "prop": "manufacturer"
 *       "selections": [
 *         {
 *           "kind": "public",
 *           "name": "name",
 *           "prop": "name"
 *         }
 *       ]
 *     },
 *     {
 *       "kind": "public",
 *       "name": "price",
 *       "prop": "price"
 *     }
 *   ]
 * }
 * ```
 * the result will be:
 * ```json
 *  [
 *    ["products", "p"],
 *    ["products", "manufacturer", "name"],
 *    ["products", "price"]
 *  ]
 * ```
 */
export function getPublicPathsOfExport(
  exp: OperationExport,
  rewrites: Array<{
    from: string[];
    to: string[];
  }>,
  current: {
    from: string[];
    to: string[];
  } = {
    from: [],
    to: [],
  },
): string[][] {
  if (exp.private) {
    // we care about public exports only
    return [];
  }

  assert(
    current.from.length === current.to.length,
    `Current paths should have the same length, received ${JSON.stringify(current, null, 2)} for ${JSON.stringify(exp)}`,
  );

  if (exp.kind === 'scalar' || exp.kind === 'enum') {
    if (exp.originalProp) {
      rewrites.push({
        from: current.from.concat(exp.prop),
        to: current.to.concat(exp.originalProp),
      });
      return [];
    }

    return [[exp.prop]];
  }

  const paths: string[][] = [];
  for (const sel of exp.selections || []) {
    const selPaths = getPublicPathsOfExport(sel, rewrites, {
      from: current.from.concat(exp.kind !== 'fragment' ? exp.prop : []),
      to: current.to.concat(
        exp.kind !== 'fragment' ? exp.originalProp ?? exp.prop : [],
      ),
    });

    for (const path of selPaths) {
      if ('name' in exp) {
        if (exp.originalProp) {
          rewrites.push({
            from: current.from.concat([exp.prop, ...path]),
            to: current.to.concat([exp.originalProp, ...path]),
          });
          return [];
        }

        paths.push([exp.prop, ...path]);
      } else {
        paths.push(path);
      }
    }
  }
  return paths;
}

/**
 * TODO: write tests
 *
 * Creates a list of paths to all deepest public exports objects without the object properties.
 * The resulting paths are sorted by array length, making sure no path overrides a previous one.
 *
 * For example, if {@link exp} is:
 * ```json
 * {
 *   "kind": "public",
 *   "name": "products",
 *   "selections": [
 *     {
 *       "kind": "public",
 *       "name": "upc"
 *     },
 *     {
 *       "kind": "public",
 *       "name": "manufacturer",
 *       "selections": [
 *         {
 *           "kind": "public",
 *           "name": "name"
 *         }
 *       ]
 *     },
 *     {
 *       "kind": "public",
 *       "name": "price"
 *     }
 *   ]
 * }
 * ```
 * the result will be:
 * ```json
 * [
 *   ["products"],
 *   ["products"],
 *   ["products", "manufacturer"]
 * ]
 * ```
 */
export function getDeepestObjectPublicPathsOfExport(
  exp: OperationExport,
): string[][] {
  if (exp.private || exp.kind === 'scalar' || exp.kind === 'enum') {
    return [[]];
  }

  const paths: string[][] = [];
  for (const sel of exp.selections || []) {
    const selPaths = getDeepestObjectPublicPathsOfExport(sel);
    for (const path of selPaths) {
      path.pop();
      if ('name' in exp) {
        paths.push([exp.prop, ...path]);
      } else {
        paths.push(path);
      }
    }
  }

  // sort the paths by array length in ascending order making sure no nested object path is overriden
  paths.sort();

  return paths;
}

export function getExportAtPath(
  exports: OperationExport[],
  path: string[],
): OperationExport {
  if (!path.length) {
    throw new Error('Cannot get values for export with an empty path');
  }

  let exp: OperationExport | undefined = {
    kind: 'object',
    name: '',
    prop: '',
    // since path is not empty, no other field is really relevant - the loop
    // will immediately go into the exp.selections
    selections: exports,
    originalProp: null,
    parentType: '',
  };
  for (let i = 0; i < path.length; i++) {
    const part = path[i]!;
    if (!('selections' in exp)) {
      throw new Error(
        `Cannot go deeper in "${part}" after ${JSON.stringify(path.slice(0, i))} for ${JSON.stringify(
          path,
        )}`,
      );
    }
    for (const sel of exp.selections) {
      if (sel.kind === 'fragment') {
        return getExportAtPath(sel.selections, path.slice(i));
      }
      if (sel.prop === part) {
        exp = sel;
        break;
      }
    }
    if (!exp) {
      throw new Error(
        `Export at path ${JSON.stringify(path)} in ${JSON.stringify(exports)} not found`,
      );
    }
  }

  return exp!; // will never be null because of conditional in loop
}

/**
 * Populates the chunk of ExecutionResult.data with the export data.
 * It does it by mutating the result data reference.
 *
 * Important thing to understand here is that it always operates on relative data,
 * meaning that {@link exp}, {@link exportPath}, {@link exportData} and {@link parentDataRef} are always relative to each other.
 *
 *  {
 *    data: {
 *      users: [
 *        { id: 1 }
 *      ]
 *    }
 *  }
 *
 * We start at the root of the data, and then we go deeper and deeper.
 * Each time we go deeper, we mutate a chunk of the result data reference.
 *
 * Example set of arguments:
 *  {@link exp}           { kind: 'scalar', name: 'name', prop: 'name' }
 *  {@link exportPath}    [ 'name']
 *  {@link exportData}    { id: 1, name: 'u-1' }
 *  {@link parentDataRef} { id: 1 }
 *
 * The result will be:
 *    data: {
 *      users: [
 *        { id: 1, name: 'u-1' }
 *      ]
 *    }
 *  }
 */
function populateResultChunkWithExportData(
  /**
   * The export operation matching the current {@link exportPath}.
   */
  exp: OperationExport,
  /**
   * The path to pluck data from the {@link exportData}.
   * It's always relative.
   */
  exportPath: (string | number)[],
  /**
   * The data to populate the {@link parentDataRef} with.
   */
  exportData: unknown,
  /**
   * A chunk of ExecutionResult.data that is mutated to form the final result.
   * It's always relative to the {@link exportPath}.
   */
  parentDataRef: unknown,
) {
  const prop = exportPath[0];
  assert(prop != null, `Expected prop to be defined`);

  const isLeaf = exportPath.length === 1;

  // If exportData is not present, we don't need to do anything
  if (exportData === undefined || exportData === null) {
    return;
  }

  // Assign the value based on export data and prop
  let exportValue = undefined;
  if (typeof prop === 'number') {
    assert(
      Array.isArray(exportData),
      'Expected exportData to be an array when prop is a number',
    );

    // If prop is a number, we need to get the value from the array
    exportValue = exportData[prop];
  }

  if (typeof prop === 'string') {
    assert(
      isRecord(exportData),
      `Expected exportData to be an object when prop is a string, got: ${JSON.stringify(exportData)}`,
    );

    // If prop is a string, we need to get the value from the object
    exportValue = exportData[prop];
  }

  if (exportValue === undefined) {
    // If value is undefined, we don't need to do anything as it's not present in the export data.
    // This can happen because the export paths are the same for the entire export data.
    // For example, if there are fragments or lists, the export path could lead to no value,
    // cause it's a path of a different object type.
    return;
  }

  if (Array.isArray(exportValue)) {
    // If export value is an array, we need to make sure the parentDataRef is an object.
    // It can't be an array as GraphQL does not support arrays within arrays.
    assert(isRecord(parentDataRef), 'Expected parentDataRef to be an object');

    // If the parentDataRef does not have any data
    // We initialise it as an empty array
    if (!Array.isArray(parentDataRef[prop])) {
      parentDataRef[prop] = [];
    }

    if (isLeaf) {
      // If it's a leaf ([String] for example), we just need to assign the value to the parentDataRef
      parentDataRef[prop] = exportValue.map((val) =>
        correctPrimitiveValue(exp!, val),
      );
      return;
    }

    // In case it's not a leaf, we need to go deeper.
    for (let j = 0; j < exportValue.length; j++) {
      // Prepend the index to the export path
      // so we can populate the export data correctly,
      // by mutating using a reference.
      const pathAfter = ([j] as (string | number)[]).concat(
        exportPath.slice(1),
      );
      populateResultChunkWithExportData(
        exp,
        pathAfter,
        exportValue,
        parentDataRef[prop],
      );
    }
    return;
  }

  if (exportValue === null) {
    assert(isRecord(parentDataRef), 'Expected parentDataRef to be an object');
    parentDataRef[prop] = null;
    return;
  }

  if (typeof exportValue === 'object') {
    if (typeof prop === 'number') {
      assert(
        Array.isArray(parentDataRef),
        'Expected parentDataRef to be an array',
      );
      const index = prop;

      if (parentDataRef.length <= index) {
        parentDataRef.push({});
      }

      populateResultChunkWithExportData(
        exp,
        exportPath.slice(1),
        exportValue,
        parentDataRef[index],
      );
      return;
    }

    assert(isRecord(parentDataRef), 'Expected parentDataRef to be an object');

    if (!parentDataRef[prop]) {
      parentDataRef[prop] = isLeaf
        ? correctPrimitiveValue(exp!, exportValue)
        : {};
    }

    if (!isLeaf) {
      populateResultChunkWithExportData(
        exp,
        exportPath.slice(1),
        exportValue,
        parentDataRef[prop],
      );
    }
    return;
  }

  assert(isRecord(parentDataRef), 'Expected parentDataRef to be an object');
  parentDataRef[prop] = correctPrimitiveValue(exp, exportValue);
}

function correctPrimitiveValue(exp: OperationExport, val: unknown): unknown {
  if (exp.kind === 'enum' && !exp.values.includes(val)) {
    return null;
  }

  return val;
}
