import { ExecutionResult, GraphQLError } from 'graphql';
import getAtPath from 'lodash.get';
import setAtPath from 'lodash.set';
import { GatherPlan, GatherPlanResolver } from './gather.js';
import { SchemaPlanSubgraph } from './schemaPlan.js';
import { Transport } from './transport.js';

export type SourceTransports = {
  [subgraph in SchemaPlanSubgraph['subgraph']]: Transport;
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
    plan.operations.flatMap((o) =>
      Object.entries(o.resolvers).map(([field, r]) =>
        executeResolver(
          transports,
          operationVariables,
          r,
          null,
          [field],
          resultRef,
        ),
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
   * Data of the `__export` fragment in the parent resolver.
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
          : // variable.kind === 'user'
            {
              ...operationVariables,
              // TODO: should the inline variables override?
              ...resolver.field.inlineVariables,
            }[variable.name],
    }),
    {},
  );

  const result = await transport.get({ query: resolver.operation, variables });

  if (result.errors?.length) {
    // stop immediately on errors, we cant traverse further
    resultRef.errors = [...(resultRef.errors || []), ...result.errors];
    return resolver.kind === 'scalar'
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

  return resolver.kind === 'scalar'
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
          Object.entries(resolver.includes).flatMap(([field, resolver]) => {
            if (Array.isArray(exportData)) {
              // if the export data is an array, we need to gather resolve each item
              return exportData.flatMap((exportData, i) => {
                const fieldData = getAtPath(exportData, field);
                if (Array.isArray(fieldData)) {
                  // if the include points to an array, we need to gather resolve each item
                  return fieldData.map((fieldDataItem, j) =>
                    executeResolver(
                      transports,
                      operationVariables,
                      resolver,
                      fieldDataItem,
                      [...pathInData, i, field, j],
                      resultRef,
                    ),
                  );
                }
                return executeResolver(
                  transports,
                  operationVariables,
                  resolver,
                  fieldData,
                  [...pathInData, i, field],
                  resultRef,
                );
              });
            }

            const fieldData = getAtPath(exportData, field);
            if (Array.isArray(fieldData)) {
              // if the include points to an array, we need to gather resolve each item
              return fieldData.map((fieldDataItem, i) =>
                executeResolver(
                  transports,
                  operationVariables,
                  resolver,
                  fieldDataItem,
                  [...pathInData, field, i],
                  resultRef,
                ),
              );
            }
            return executeResolver(
              transports,
              operationVariables,
              resolver,
              fieldData,
              [...pathInData, field],
              resultRef,
            );
          }),
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

  if (resolver.kind === 'scalar') {
    // scalar fields are exported directly at the path in the result
    setAtPath(resultRef.data, pathInData, exportData);
    return;
  }

  for (const exportPath of resolver.public.map((e) => e.split('.'))) {
    const lastKey = exportPath[exportPath.length - 1];
    const valBeforeLast =
      exportPath.length > 1
        ? getAtPath(exportData, exportPath.slice(0, exportPath.length - 1))
        : null;

    if (Array.isArray(valBeforeLast)) {
      // if we're exporting fields in an array, set for each item of the array
      for (let i = 0; i < valBeforeLast.length; i++) {
        setAtPath(
          resultRef.data,
          [
            ...pathInData,
            ...exportPath.slice(0, exportPath.length - 1)!,
            i,
            lastKey!,
          ],
          getAtPath(valBeforeLast[i], [lastKey!]),
        );
      }
    } else {
      // otherwise, just set in object
      setAtPath(
        resultRef.data,
        [...pathInData, ...exportPath],
        getAtPath(exportData, exportPath),
      );
    }
  }
}
