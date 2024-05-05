import { ExecutionResult, GraphQLError } from 'graphql';
import getAtPath from 'lodash.get';
import setAtPath from 'lodash.set';
import { GatherPlan, GatherPlanResolver } from './gather.js';
import { SchemaPlanSource } from './schemaPlan.js';
import { Transport } from './transport.js';

export type SourceTransports = {
  [source in SchemaPlanSource['source']]: Transport;
};

export async function execute(
  transports: SourceTransports,
  plan: GatherPlan,
  operationVariables: Record<string, unknown>,
): Promise<
  ExecutionResult<Record<string, unknown>, { explain: ExecutionExplain[] }>
> {
  const resultRef: ExecutionResult = {};
  // TODO: batch resolvers going to the same source
  const explain = await Promise.all(
    plan.operations.flatMap((o) =>
      o.resolvers.map((r) =>
        executeResolver(
          transports,
          operationVariables,
          r,
          null,
          [r.typeOrField],
          resultRef,
        ),
      ),
    ),
  );
  return {
    ...resultRef,
    extensions: {
      ...resultRef.extensions,
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
  const transport = transports[resolver.source];
  if (!transport) {
    throw new Error(`Transport for source "${resolver.source}" not found`);
  }

  const variables = {
    ...(!parentExportData
      ? // this is the operation (root) resolver because there's no parent data
        operationVariables
      : // this is a included resolver because the includer's providing data
        Object.values(resolver.variables).reduce(
          (agg, variable) => ({
            ...agg,
            [variable.name]:
              'select' in variable
                ? getAtPath(parentExportData, variable.select)
                : variable.constant,
          }),
          {},
        )),
    // TODO: should the inline variables override?
    ...resolver.inlineVariables,
  };

  const result = await transport.get({
    query: resolver.operation,
    variables,
  });
  if (result.errors?.length) {
    // stop immediately on errors, we cant traverse further
    resultRef.errors = result.errors;
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
  }
  if (!result.data) {
    const err = new Error(
      'GraphQL execution result has no errors but does not contain data',
    );
    err.name = 'GraphQLExecutionNoData';
    throw err;
  }

  if (!resultRef.data) {
    resultRef.data = {};
  }

  const exportData = getAtPath(result.data, resolver.pathToExportData);

  if (resolver.kind === 'scalar') {
    // is a scalar field, export itself at the path in the result
    setAtPath(resultRef.data, pathInData, exportData);
  } else {
    // otherwise, set at each field in the path of the composite field
    if (Array.isArray(exportData)) {
      // set key in each item of the array
      for (let i = 0; i < exportData.length; i++) {
        const exportDataItem = exportData[i];
        for (const exportPath of resolver.public.map((e) => e.split('.'))) {
          const lastKey = exportPath[exportPath.length - 1];
          const valBeforeLast =
            exportPath.length > 1
              ? getAtPath(
                  exportDataItem,
                  exportPath.slice(0, exportPath.length - 1),
                )
              : null;

          if (Array.isArray(valBeforeLast)) {
            // set key in each item of the array
            for (let j = 0; j < valBeforeLast.length; j++) {
              setAtPath(
                resultRef.data,
                [
                  ...pathInData,
                  i,
                  ...exportPath.slice(0, exportPath.length - 1)!,
                  j,
                  lastKey!,
                ],
                getAtPath(valBeforeLast[j], [lastKey!]),
              );
            }
          } else {
            setAtPath(
              resultRef.data,
              [...pathInData, i, ...exportPath],
              getAtPath(exportDataItem, exportPath),
            );
          }
        }
      }
    } else {
      for (const exportPath of resolver.public.map((e) => e.split('.'))) {
        const lastKey = exportPath[exportPath.length - 1];
        const valBeforeLast =
          exportPath.length > 1
            ? getAtPath(exportData, exportPath.slice(0, exportPath.length - 1))
            : null;

        if (Array.isArray(valBeforeLast)) {
          // set key in each item of the array
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
          setAtPath(
            resultRef.data,
            [...pathInData, ...exportPath],
            getAtPath(exportData, exportPath),
          );
        }
      }
    }
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
        // TODO: batch resolvers going to the same source
        includes: await Promise.all(
          Object.entries(resolver.includes).flatMap(([field, resolver]) => {
            if (Array.isArray(exportData)) {
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
