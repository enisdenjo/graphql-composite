import { ExecutionResult, GraphQLError } from 'graphql';
import mergeObject from 'lodash/fp/merge.js';
import getAtPath from 'lodash/get.js';
import setAtPath from 'lodash/set.js';
import {
  GatherPlan,
  GatherPlanCompositeResolver,
  GatherPlanResolver,
  OperationExport,
  OVERWRITE_FIELD_NAME_PART,
} from './gather.js';
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

export type ExecutionExplain = Omit<
  GatherPlanResolver,
  'variables' | 'includes'
> & {
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
  parentExportData: unknown,
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

  const variables = getVariables(
    operationVariables,
    resolver,
    parentExportData,
  );

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

  // at this point, we're sure that there are no errors
  // so we can safely initialise the result data (if not already)
  resultRef.data ??= {};

  const exportData = getAtPath(result.data, resolver.pathToExportData);

  if (resolver.kind === 'primitive') {
    // primitive resolver data is exported directly at the path in the result
    setAtPath(resultRef.data, pathInData, exportData);
    return {
      ...resolver,
      ...result,
      pathInData,
      variables,
      // primitive resolvers dont have includes
    };
  }

  let dest = getAtPath(resultRef.data, pathInData);
  if (Array.isArray(exportData)) {
    if (dest === undefined) {
      dest = []; // array
      setAtPath(resultRef.data, pathInData, dest);
    }
    for (let i = 0; i < exportData.length; i++) {
      const destItem = (dest[i] = {}); // array item
      const exportDataItem = exportData[i];
      populateUsingPublicExports(resolver.exports, exportDataItem, destItem);
    }
  } else {
    if (dest === undefined) {
      dest = {}; // object
      setAtPath(resultRef.data, pathInData, dest);
    }
    populateUsingPublicExports(resolver.exports, exportData, dest);
  }

  const includes: ExecutionExplain[] = [];
  async function executeInclude(
    resolvers: GatherPlanCompositeResolver[],
    exportDataAtPath: any,
    /** Full path in the {@link exportData} that the {@link resolvers} are resolving. */
    path: (string | number)[],
    /** The depth (index) in the current {@link path}. */
    depth: number,
  ) {
    const pathBeforeField = path.slice(0, depth);
    const field = path[depth]!;
    const isLast = depth === path.length - 1;
    if (!isLast) {
      // this is not the last field in the field path, continue expanding the
      // path before reaching the last field that will then get resolved

      const pathAfterField = path.slice(depth + 1);
      const fieldData = getAtPath(exportDataAtPath, field);

      if (Array.isArray(fieldData)) {
        // TODO: any parallelism issues with mutating the result ref?
        await Promise.all(
          fieldData.map((fieldDataItem, i) =>
            executeInclude(
              resolvers,
              fieldDataItem,
              [...pathBeforeField, field, i, ...pathAfterField],
              depth +
                1 + // into field
                1, // into field item
            ),
          ),
        );
      } else {
        await executeInclude(
          resolvers,
          fieldData,
          [...pathBeforeField, field, ...pathAfterField],
          depth + 1, // into field
        );
      }

      return;
    }

    // if there's no field specified, we're resolving additional fields for the current one
    const resolvingAdditionalFields = field === '';

    if (Array.isArray(exportDataAtPath)) {
      // if the export data is an array, we need to gather resolve each item
      for (let i = 0; i < exportDataAtPath.length; i++) {
        const exportDataItem = exportDataAtPath[i];
        const fieldData = resolvingAdditionalFields
          ? exportDataItem
          : getAtPath(exportDataItem, field);
        if (Array.isArray(fieldData)) {
          // if the include points to an array, we need to gather resolve each item
          for (let j = 0; j < fieldData.length; j++) {
            const fieldDataItem = fieldData[j];
            includes.push(
              ...(await resolveIncludes(
                transports,
                operationVariables,
                resolvers,
                fieldDataItem,
                resolvingAdditionalFields
                  ? [...pathInData, i, j]
                  : [...pathInData, i, ...pathBeforeField, field, j],
                resultRef,
              )),
            );
          }
        } else {
          includes.push(
            ...(await resolveIncludes(
              transports,
              operationVariables,
              resolvers,
              fieldData,
              resolvingAdditionalFields
                ? [...pathInData, i]
                : [...pathInData, i, ...pathBeforeField, field],
              resultRef,
            )),
          );
        }
      }
    } else {
      const fieldData = resolvingAdditionalFields
        ? exportDataAtPath
        : getAtPath(exportDataAtPath, field);
      if (Array.isArray(fieldData)) {
        // if the include points to an array, we need to gather resolve each item
        for (let i = 0; i < fieldData.length; i++) {
          const fieldDataItem = fieldData[i];
          includes.push(
            ...(await resolveIncludes(
              transports,
              operationVariables,
              resolvers,
              fieldDataItem,
              resolvingAdditionalFields
                ? [...pathInData, i]
                : [...pathInData, ...pathBeforeField, field, i],
              resultRef,
            )),
          );
        }
      } else {
        includes.push(
          ...(await resolveIncludes(
            transports,
            operationVariables,
            resolvers,
            fieldData,
            resolvingAdditionalFields
              ? pathInData
              : [...pathInData, ...pathBeforeField, field],
            resultRef,
          )),
        );
      }
    }
  }

  // TODO: any parallelism issues with mutating the result ref?
  await Promise.all(
    Object.entries(resolver.includes).map(([dotPath, resolverOrResolvers]) =>
      executeInclude(
        Array.isArray(resolverOrResolvers)
          ? resolverOrResolvers
          : [resolverOrResolvers],
        exportData,
        dotPath.split('.'),
        0,
      ),
    ),
  );

  return {
    ...resolver,
    ...result,
    pathInData,
    variables,
    includes,
  };
}

/**
 * TODO: batch resolvers going to the same subgraph
 */
async function resolveIncludes(
  transports: SourceTransports,
  /**
   * The variables for the execution. Those that the user provides.
   * These should be used only on the operation (root) resolver.
   */
  operationVariables: Record<string, unknown>,
  /**
   * Included resolvers to execute.
   */
  resolvers: GatherPlanResolver[],
  /**
   * Available export data to be used in the {@link resolvers}.
   */
  exportData: unknown,
  /**
   * The path in the {@link resultRef} data this include is resolving.
   */
  pathInData: (string | number)[],
  /**
   * Reference whose object gets mutated to form the final
   * result (the one that the caller gets).
   */
  resultRef: ExecutionResult,
): Promise<ExecutionExplain[]> {
  if (Array.isArray(exportData)) {
    // items should be mapped by the caller
    throw new Error(
      'Export data while executing includes must not be an array',
    );
  }

  const hasSelectVariables: GatherPlanResolver[] = [];
  const doesntHaveSelectVariables: GatherPlanResolver[] = [];
  for (const resolver of resolvers) {
    const { exportDataDoesntProvideAllSelectVariables } = checkVariables(
      resolver,
      exportData,
    );
    if (exportDataDoesntProvideAllSelectVariables) {
      doesntHaveSelectVariables.push(resolver);
    } else {
      hasSelectVariables.push(resolver);
    }
  }

  if (!doesntHaveSelectVariables.length) {
    // all resolvers have all select variables
    return await Promise.all(
      hasSelectVariables.map((r) =>
        executeResolver(
          transports,
          operationVariables,
          r,
          exportData,
          pathInData,
          resultRef,
        ),
      ),
    );
  }

  if (!hasSelectVariables.length) {
    // no resolver has select variables
    // if parent's export data dont have all select variables
    // that means we're resolving a field of a non-existing
    // parent. this can happen with interfaces (see AccountsSpreadAdmin test in federation/simple-interface-object)
    // we therefore just set an empty object at the path, if there's
    // nothing set already
    if (resultRef.data && getAtPath(resultRef.data, pathInData) === undefined) {
      // TODO: should throw if resultRef's data is not available?
      setAtPath(resultRef.data, pathInData, {});
    }
    return doesntHaveSelectVariables.map((r) =>
      r.kind === 'primitive'
        ? {
            ...r,
            pathInData,
            variables: getVariables(operationVariables, r, exportData),
          }
        : {
            ...r,
            pathInData,
            variables: getVariables(operationVariables, r, exportData),
            includes: [],
          },
    );
  }

  // TODO: be smarter about this, check if resolvers with select variables export necessary variables for the leftovers

  // some resolvers have select variables, some dont
  let mergedExportData = exportData;
  const results = await Promise.all(
    hasSelectVariables.map((r) =>
      executeResolver(
        transports,
        operationVariables,
        r,
        exportData,
        pathInData,
        resultRef,
      ).then((result) => {
        if (result.data) {
          mergedExportData = mergeObject(
            mergedExportData,
            getAtPath(result.data, result.pathToExportData),
          );
        }
        return result;
      }),
    ),
  );

  return [
    ...results,
    ...(await resolveIncludes(
      transports,
      operationVariables,
      doesntHaveSelectVariables,
      mergedExportData,
      pathInData,
      resultRef,
    )),
  ];
}

export function populateUsingPublicExports(
  exports: OperationExport[],
  exportData: unknown,
  /**
   * Object that gets mutated populating it's contents
   * with the {@link exportData} using the defined {@link exports}.
   */
  dest: Record<string, unknown>,
) {
  for (const exp of exports) {
    if (exp.private) {
      continue;
    }

    if (exp.kind === 'fragment') {
      populateUsingPublicExports(exp.selections, exportData, dest);
      continue;
    }

    let field = exp.alias || exp.name;
    let val = getAtPath(exportData, field);
    if (exp.overwrite) {
      if (!exp.alias) {
        throw new Error('An overwrite export must have an alias');
      }
      field = exp.alias.split(OVERWRITE_FIELD_NAME_PART)[0]!; // a split always has item at 0
      if (val == null) {
        // it's an overwrite field but the value is nullish, skip setting it
        continue;
      }
    }

    if (exp.kind === 'scalar' || exp.kind === 'enum') {
      // TODO: check if val is a primitive value
      // TODO: what if the val is undefined? (different from null)
      if (exp.kind === 'enum' && !exp.values.includes(val)) {
        // some enum values can be inaccessible and should therefore be nullified
        val = null;
      }
      setAtPath(dest, field, val);
      continue;
    }

    // exp.kind === 'object'
    if (Array.isArray(val)) {
      const arr: Record<string, unknown>[] = [];
      for (const item of val) {
        const part = {};
        populateUsingPublicExports(exp.selections, item, part);
        arr.push(part);
      }
      dest[field] = arr;
      continue;
    }

    populateUsingPublicExports(exp.selections, val, (dest[field] = {}));
  }
}

function checkVariables(
  resolver: GatherPlanResolver,
  exportData: unknown,
): { exportDataDoesntProvideAllSelectVariables: boolean } {
  return {
    exportDataDoesntProvideAllSelectVariables: Object.values(
      resolver.variables,
    ).some(
      (variable) =>
        variable.kind === 'select' &&
        getAtPath(exportData, variable.select) === undefined,
    ),
  };
}

function getVariables(
  operationVariables: Record<string, unknown>,
  resolver: GatherPlanResolver,
  exportData: unknown,
) {
  return Object.values(resolver.variables).reduce(
    (agg, variable) => ({
      ...agg,
      [variable.name]:
        variable.kind === 'select'
          ? getAtPath(exportData, variable.select)
          : variable.kind === 'constant'
            ? variable.value
            : // variable.kind === 'user'
              operationVariables[variable.name],
    }),
    {},
  );
}
