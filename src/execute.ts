import { ExecutionResult, GraphQLError } from 'graphql';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import getAtPath from 'lodash.get';
import setAtPath from 'lodash.set';
import { GatherPlan, GatherPlanResolver } from './gather.js';

export interface ExecutionContext {
  /** Fetch getter by {@link SchemaPlanSource.id} used for {@link SchemaPlanFetchResolver}. */
  getFetch: (sourceId: string) => typeof fetch;
}

export async function execute(
  ctx: ExecutionContext,
  plan: GatherPlan,
  variables: Record<string, unknown>,
): Promise<ExecutionResult & { explain: ExecutionExplain[] }> {
  const result: ExecutionResult = {};
  // TODO: batch resolvers going to the same source
  const explain = await Promise.all(
    plan.operations.flatMap((o) =>
      o.resolvers.map((r) =>
        executeResolver(ctx, r, variables, [r.typeOrField], result, null),
      ),
    ),
  );
  return { ...result, explain };
}

export interface ExecutionExplain {
  path: (string | number)[];
  query: string;
  variables: Record<string, unknown>;
  data?: unknown;
  errors?: ReadonlyArray<GraphQLError>;
  private: GatherPlanResolver['private'];
  public: GatherPlanResolver['public'];
  includes: ExecutionExplain[];
}

async function executeResolver(
  ctx: ExecutionContext,
  resolver: GatherPlanResolver,
  /** The variables for the operation. Those that the user provides. */
  operationVariables: Record<string, unknown> | null,
  /**
   * The path in the {@link resultRef} this gather is resolving.
   */
  path: (string | number)[],
  /**
   * Mutated argument that references the final result,
   * ready to be passed back to the user.
   */
  resultRef: ExecutionResult,
  /**
   * Data of the `export` fragment in the parent resolver.
   */
  parentExportData: Record<string, unknown> | null,
): Promise<ExecutionExplain> {
  const { getFetch } = ctx;

  const query = buildResolverQuery(resolver);
  const variables =
    operationVariables ||
    Object.values(resolver.variables).reduce(
      (agg, { name, select }) => ({
        ...agg,
        [name]: getAtPath(parentExportData, select),
      }),
      {},
    );
  const res = await getFetch(resolver.source)(resolver.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/graphql-response+json, application/json',
    },
    body: JSON.stringify({
      query,
      // TODO: actual operation name
      operationName: null,
      variables,
    }),
  });
  if (!res.ok) {
    const err = new Error(
      `${res.status} ${res.statusText}\n${await res.text()}`,
    );
    err.name = 'ResponseError';
    throw err;
  }

  const result: ExecutionResult = await res.json();
  if (result.errors?.length) {
    // stop immediately on errors, no need to traverse further
    resultRef.errors = result.errors;
    return {
      path,
      query,
      variables,
      ...result,
      private: [],
      public: [],
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

  const exportData =
    result.data[
      // TODO: we only assume the root field is where the export fragment is, but isnt always true
      Object.keys(result.data)[0]!
    ];

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
            ...path,
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
        [...path, ...exportPath],
        getAtPath(exportData, exportPath),
      );
    }
  }

  return {
    path,
    query,
    variables,
    ...result,
    private: resolver.private,
    public: resolver.public,
    // TODO: batch resolvers going to the same source
    includes: await Promise.all(
      Object.entries(resolver.includes).flatMap(([field, resolver]) => {
        const fieldData = getAtPath(exportData, field);
        if (Array.isArray(fieldData)) {
          // if the include points to an array, we need to gather resolve each item
          return fieldData.map((fieldDataItem, i) =>
            executeResolver(
              ctx,
              resolver,
              null,
              [...path, field, i],
              resultRef,
              fieldDataItem,
            ),
          );
        }
        return executeResolver(
          ctx,
          resolver,
          null,
          [...path, field],
          resultRef,
          fieldData,
        );
      }),
    ),
  };
}

export function buildResolverQuery(
  resolver: Pick<
    GatherPlanResolver,
    'operation' | 'type' | 'public' | 'private'
  >,
) {
  let query = resolver.operation;
  query += ` fragment export on ${resolver.type} { `;
  const obj = {};
  for (const path of resolver.public) {
    setAtPath(obj, path, true);
  }
  for (const path of resolver.private) {
    setAtPath(obj, path, true);
  }
  query += jsonToGraphQLQuery(obj);
  query += ' }';
  return query;
}
