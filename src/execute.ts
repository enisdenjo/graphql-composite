import { ExecutionResult, GraphQLError } from 'graphql';
import getAtPath from 'lodash.get';
import setAtPath from 'lodash.set';
import { GatherPlan, GatherPlanResolver, OperationExport } from './gather.js';
import { Transport } from './transport.js';

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
      populateResultWithExportData(
        resolver,
        exportDataItem,
        [...pathInData, i],
        resultRef,
      );
    }
  } else {
    populateResultWithExportData(resolver, exportData, pathInData, resultRef);
  }

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
  if (!resultRef.data) {
    // at this point, we're sure that there are no errors
    // so we can initialise the result data (if not already)
    resultRef.data = {};
  }

  if (resolver.kind === 'primitive') {
    // scalar fields are exported directly at the path in the result
    setAtPath(resultRef.data, pathInData, exportData);
    return;
  }

  const publicExportPaths = resolver.exports.flatMap(getPublicPathsOfExport);

  if (!publicExportPaths.length) {
    for (const deepestObjectPath of resolver.exports.flatMap(
      getDeepestObjectPublicPathsOfExport,
    )) {
      // if there are no public export paths defined, we just want
      // to make the pathInData an object (because it's a composite resolver)
      // see [NOTE 1] in gather.ts for more info on why we perform no-export operations
      setAtPath(resultRef.data, [...pathInData, ...deepestObjectPath], {});
    }
  } else {
    for (const exportPath of publicExportPaths) {
      const exp = getExportAtPath(resolver.exports, exportPath);

      const lastKey = exportPath[exportPath.length - 1];
      const valBeforeLast =
        exportPath.length > 1
          ? getAtPath(exportData, exportPath.slice(0, exportPath.length - 1))
          : null;

      if (Array.isArray(valBeforeLast)) {
        // if we're exporting fields in an array, set for each item of the array
        for (let i = 0; i < valBeforeLast.length; i++) {
          let val = getAtPath(valBeforeLast[i], [lastKey!]);
          if (exp.kind === 'enum' && !exp.values.includes(val)) {
            // some enum values can be inaccessible and should therefore be nullified
            val = null;
          }
          setAtPath(
            resultRef.data,
            [
              ...pathInData,
              ...exportPath.slice(0, exportPath.length - 1)!,
              i,
              lastKey!,
            ],
            val,
          );
        }
      } else {
        // otherwise, just set in object
        let val = getAtPath(exportData, exportPath);
        if (exp.kind === 'enum' && !exp.values.includes(val)) {
          // some enum values can be inaccessible and should therefore be nullified
          val = null;
        }
        setAtPath(resultRef.data, [...pathInData, ...exportPath], val);
      }
    }
  }
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
function getPublicPathsOfExport(exp: OperationExport): string[][] {
  if (exp.private) {
    // we care about public exports only
    return [];
  }

  if (exp.kind === 'scalar' || exp.kind === 'enum') {
    return [[exp.prop]];
  }

  const paths: string[][] = [];
  for (const sel of exp.selections || []) {
    const selPaths = getPublicPathsOfExport(sel);

    for (const path of selPaths) {
      if ('name' in exp) {
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
function getDeepestObjectPublicPathsOfExport(exp: OperationExport): string[][] {
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

function getExportAtPath(
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
