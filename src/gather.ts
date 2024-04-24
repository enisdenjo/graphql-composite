import {
  DocumentNode,
  ExecutionResult,
  GraphQLCompositeType,
  GraphQLEnumType,
  GraphQLError,
  GraphQLScalarType,
  GraphQLSchema,
  isCompositeType,
  isListType,
  isNonNullType,
  OperationTypeNode,
  print,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import getAtPath from 'lodash.get';
import setAtPath from 'lodash.set';
import {
  planSchema,
  SchemaPlan,
  SchemaPlanFetchResolver,
  SchemaPlanResolver,
  SchemaPlanResolverVariable,
  SchemaPlanSource,
} from './schemaPlan.js';

export interface GatherPlan {
  query: string;
  /** Dot notation flat list of paths in the GraphQL query. */
  paths: string[];
  operations: GatherPlanOperation[];
}

export interface GatherPlanOperation {
  name: string | null;
  type: OperationTypeNode;
  fields: GatherPlanField[];
  resolvers: GatherPlanResolver[];
}

type GatherPlanField = GatherPlanCompositeField | GatherPlanScalarField;

export interface GatherPlanCompositeField {
  kind: 'composite';
  name: string;
  type: string;
  isNonNull: boolean; // TODO: how to use? validating gather results?
  isList: boolean; // TODO: how to use? validating gather results?
  isListItemNonNull: boolean; // TODO: how to use? validating gather results?
  fields: GatherPlanField[];
}

export interface GatherPlanScalarField {
  kind: 'scalar';
  name: string;
  type: string;
  isNonNull: boolean; // TODO: how to use? validating gather results?
}

export interface GatherPlanResolver
  extends SchemaPlanSource,
    SchemaPlanResolver {
  /**
   * Parent resolver's {@link GatherPlanResolver.exports} that are needed as variables to
   * perform this resolution.
   *
   * Is actually a map of parent resolver's exported paths to the
   * {@link SchemaPlanResolver.variables} names.
   *
   * *Parent resolver is the one that {@link GatherPlanResolver.includes} this one.
   */
  imports: {
    [exportPath in GatherPlanResolver['exports'][number]]: SchemaPlanResolverVariable['name'];
  };
  /**
   * Dot notation flat list of field paths to add to the `export`
   * fragment on the query. They're also the exported fields of this resolver.
   */
  exports: string[];
  /**
   * Other resolvers that depend on fields from this resolver.
   * These are often resolvers of fields that don't exist in the resolver.
   *
   * A map of field paths to the necessary resolver.
   */
  includes: Record<string, GatherPlanResolver>;
}

export interface GatherContext {
  /**
   * User provided variables.
   * They're to be used by the operation resolver query.
   */
  variables: Record<string, unknown>;
  /** Fetch getter by {@link SchemaPlanSource.id} used for {@link SchemaPlanFetchResolver}. */
  getFetch: (sourceId: string) => typeof fetch;
}

export async function gather(
  ctx: GatherContext,
  plan: GatherPlan,
): Promise<ExecutionResult> {
  const result: ExecutionResult = {};
  // TODO: batch resolvers going to the same source
  await Promise.all(
    plan.operations.flatMap((o) =>
      o.resolvers.map((r) =>
        gatherResolve(
          ctx,
          r,
          {
            // TODO: actual variables
            id: '',
          },
          [r.name],
          result,
        ),
      ),
    ),
  );
  return result;
}

export interface GatherPlanResolverResult {
  data?: unknown;
  errors?: ReadonlyArray<GraphQLError>;
  includes: GatherPlanResolverResult[];
}

async function gatherResolve(
  ctx: GatherContext,
  resolver: GatherPlanResolver,
  variables: Record<string, unknown> | null,
  /**
   * The path in the {@link resultRef} this gather is resolving.
   */
  path: (string | number)[],
  /**
   * Mutated argument that references the final result,
   * ready to be passed back to the user.
   */
  resultRef: ExecutionResult,
): Promise<GatherPlanResolverResult> {
  const { getFetch } = ctx;

  const res = await getFetch(resolver.id)(resolver.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/graphql-response+json, application/json',
    },
    body: JSON.stringify({
      query: buildResolverQuery(resolver),
      // TODO: actual operation name
      operationName: null,
      variables:
        variables ||
        (() => {
          const variables: Record<string, unknown> = {};
          for (const { name, select } of Object.values(resolver.variables)) {
            variables[name] = getAtPath(resultRef.data, [...path, select]);
          }
          return variables;
        })(),
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
    // stop immediately on errors, no need to traverse futher
    resultRef.errors = result.errors;
    return {
      ...result,
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

  for (const exportPath of resolver.exports.map((e) => e.split('.'))) {
    const lastKey = exportPath[exportPath.length - 1];
    const valBeforeLast =
      exportPath.length > 1
        ? getAtPath(
            result.data[
              // TODO: we only assume the root field is where the export fragment is, but isnt always true
              Object.keys(result.data)[0]!
            ],
            exportPath.slice(0, exportPath.length - 1),
          )
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
        getAtPath(
          result.data[
            // TODO: we only assume the root field is where the export fragment is, but isnt always true
            Object.keys(result.data)[0]!
          ],
          exportPath,
        ),
      );
    }
  }

  return {
    ...result,
    // TODO: batch resolvers going to the same source
    includes: await Promise.all(
      Object.entries(resolver.includes).flatMap(([field, resolver]) => {
        const val = getAtPath(result.data, [...path, field]);
        if (Array.isArray(val)) {
          // if the include points to an array, we need to gather resolve each item
          return val.map((_, i) =>
            gatherResolve(ctx, resolver, null, [...path, field, i], resultRef),
          );
        }
        return gatherResolve(ctx, resolver, null, [...path, field], resultRef);
      }),
    ),
  };
}

export function buildResolverQuery(
  resolver: Pick<GatherPlanResolver, 'operation' | 'type' | 'exports'>,
) {
  let query = resolver.operation;
  query += ` fragment export on ${resolver.type} { `;
  const obj = {};
  for (const path of resolver.exports) {
    setAtPath(obj, path, true);
  }
  query += jsonToGraphQLQuery(obj);
  query += ' }';
  return query;
}

export function planGather(
  schema: GraphQLSchema,
  doc: DocumentNode,
): GatherPlan {
  const schemaPlan = planSchema(schema);
  const gatherPlan: GatherPlan = {
    query: print(doc),
    paths: [],
    operations: [],
  };

  const entries: string[] = [];
  let depth = 0;
  const typeInfo = new TypeInfo(schema);
  let currOperation: GatherPlanOperation;
  visit(
    doc,
    visitWithTypeInfo(typeInfo, {
      OperationDefinition(node) {
        currOperation = {
          name: node.name?.value || null,
          type: node.operation,
          fields: [],
          resolvers: [],
        };
        gatherPlan.operations.push(currOperation);
      },
      // TODO: does not properly enter fragments
      Field: {
        enter(node) {
          const parentType = typeInfo.getParentType();
          if (!parentType) {
            throw new Error(`No parent type found for node ${node.name.value}`);
          }

          let type = typeInfo.getType();
          let isNonNull = false;
          type = isNonNullType(type) ? ((isNonNull = true), type.ofType) : type;
          let isList = false;
          type = isListType(type) ? ((isList = true), type.ofType) : type;
          let isListItemNonNull = false;
          type = isNonNullType(type)
            ? ((isListItemNonNull = true), type.ofType)
            : type;
          if (!type) {
            throw new Error(`No type found for node ${node.name.value}`);
          }
          type = type as
            | GraphQLScalarType
            | GraphQLCompositeType
            | GraphQLEnumType;

          if (isCompositeType(type)) {
            insertFieldToOperationAtDepth(currOperation, depth, {
              kind: 'composite',
              name: node.name.value,
              type: type.name,
              isNonNull,
              isList,
              isListItemNonNull,
              fields: [],
            });
          } else {
            insertFieldToOperationAtDepth(currOperation, depth, {
              kind: 'scalar',
              name: node.name.value,
              type: type.name,
              isNonNull,
            });
          }

          entries.push(node.name.value);
          gatherPlan.paths.push(entries.join('.'));
          depth++;
        },
        leave() {
          entries.pop();
          depth--;
        },
      },
    }),
  );

  for (const operation of gatherPlan.operations) {
    operation.resolvers = planGatherResolversForOperation(
      schemaPlan,
      operation,
    );
  }

  return gatherPlan;
}

function insertFieldToOperationAtDepth(
  operation: GatherPlanOperation,
  depth: number,
  field: GatherPlanField,
) {
  let curr: { fields: GatherPlanField[] } = operation;
  for (let i = 0; i < depth; i++) {
    // increase depth by going into the last field of the current field
    const field = curr.fields[curr.fields.length - 1]!;
    if (field.kind !== 'composite') {
      throw new Error(
        `Cannot add a field at depth ${depth} because it's composite`,
      );
    }
    curr = field;
  }
  curr.fields.push(field);
}

function planGatherResolversForOperation(
  schemaPlan: SchemaPlan,
  operation: GatherPlanOperation,
): GatherPlanResolver[] {
  const operationPlan = schemaPlan.operations[operation.type];
  if (!operationPlan) {
    throw new Error(
      `Schema plan does not have the "${operation.type}" operation`,
    );
  }

  const resolvers: GatherPlanResolver[] = [];

  for (const operationField of operation.fields) {
    if (operationField.kind === 'scalar') {
      throw new Error('TODO');
    }

    const operationFieldPlan = operationPlan.fields[operationField.name];
    if (!operationFieldPlan) {
      throw new Error(
        `Schema operation plan "${operationPlan.name}" doesn't have a "${operationField.name}" field`,
      );
    }
    if (!Object.keys(operationFieldPlan.resolvers).length) {
      throw new Error(
        `Schema operation plan "${operationPlan.name}" field "${operationField.name}" doesn't have resolvers`,
      );
    }

    const typePlan = schemaPlan.compositeTypes[operationField.type];
    if (!typePlan) {
      throw new Error(
        `Schema plan doesn't have the "${operationField.type}" composite type`,
      );
    }

    for (const field of operationField.fields) {
      const fieldPlan = typePlan.fields[field.name];
      if (!fieldPlan) {
        throw new Error(
          `Schema plan "${typePlan.name}" composite type doesn't have a "${field.name}" field`,
        );
      }

      let resolver = resolvers.find((r) => fieldPlan.sources[r.id]);
      if (!resolver) {
        const resolverPlan = Object.values(operationFieldPlan.resolvers).find(
          (r) => fieldPlan.sources[r.id],
        );
        if (!resolverPlan) {
          // TODO: less confusing error
          throw new Error(
            `Schema operation plan "${operationPlan.name}" field "${operationField.name}" doesn't have resolvers for any of the composite type "${typePlan.name}" field's "${fieldPlan.name}" sources`,
          );
        }
        resolver = {
          ...resolverPlan,
          imports: {},
          exports: [],
          includes: {},
        };
        resolvers.push(resolver);
      }

      if (field.kind === 'composite') {
        // dont include the root of the composite type as an export path
        //   1. operation `{ products { name } }` should have the following exports:
        //      ['products.name'] and not ['products', 'products.name']
        //   2. operation `{ products { manifacturer { name } } }` should have the following exports:
        //      ['products.manifacturer.name'] and not ['products', 'products.manifacturer', 'products.manifacturer.name']
      } else {
        resolver.exports.push(field.name);
      }

      if (field.kind === 'composite') {
        insertResolversForGatherPlanCompositeField(
          schemaPlan,
          field,
          resolver,
          '',
        );
      }
    }
  }

  return resolvers;
}

function insertResolversForGatherPlanCompositeField(
  schemaPlan: SchemaPlan,
  parent: GatherPlanCompositeField,
  parentResolver: GatherPlanResolver,
  pathPrefix: string,
) {
  for (const field of parent.fields) {
    const typePlan = schemaPlan.compositeTypes[parent.type];
    if (!typePlan) {
      throw new Error(
        `Schema plan doesn't have the "${parent.type}" composite type`,
      );
    }

    const fieldPlan = typePlan.fields[field.name];
    if (!fieldPlan) {
      throw new Error(
        `Schema plan "${typePlan.name}" composite type doesn't have a "${field.name}" field`,
      );
    }

    let resolver = fieldPlan.sources[parentResolver.id]
      ? parentResolver
      : Object.values(parentResolver.includes).find(
          (r) => fieldPlan.sources[r.id],
        );
    if (!resolver) {
      // this field cannot be resolved from the parent's source
      // add an dependant resolver to the parent for the field(s)

      const typePlan = schemaPlan.compositeTypes[parent.type];
      if (!typePlan) {
        throw new Error(
          `Schema plan doesn't have the "${parent.type}" composite type`,
        );
      }

      const resolverPlan = Object.values(typePlan.resolvers).find(
        (r) => fieldPlan.sources[r.id],
      );
      if (!resolverPlan) {
        throw new Error(
          `Schema plan composite type "${typePlan.name}" doesn't have a resolver for any of the "${fieldPlan.name}" field sources`,
        );
      }
      if (!Object.keys(resolverPlan.variables).length) {
        // TODO: composite type resolver must always have variables, right?
        throw new Error(
          `Schema plan composite type "${typePlan.name}" field "${fieldPlan.name}" resolver doesn't require variables`,
        );
      }

      const needs: GatherPlanResolver['imports'] = {};
      for (const { name, select } of Object.values(resolverPlan.variables)) {
        // make sure parent resolver - the one that {@link GatherPlanResolver.includes} this
        // one - exports fields that are needed as variables to perform the resolution
        const path = `${pathPrefix}${parent.name}.${select}`;
        const need = parentResolver.exports.find((e) => e === path);
        if (!need) {
          // TODO: disallow pushing same path multiple times
          // TODO: what happens if the parent source cannot resolve this field?
          parentResolver.exports.push(path);
        }
        needs[path] = name;
      }

      resolver = { ...resolverPlan, imports: needs, exports: [], includes: {} };

      parentResolver.includes[`${pathPrefix}${parent.name}`] = resolver;
    }

    const resolvingParentType = resolver.type === parent.type;

    const path = `${pathPrefix}${
      resolvingParentType
        ? ''
        : // include the parent field only if we're NOT directly resolving
          // the parent; meaning, this field is a nested field of the parent
          `${parent.name}.`
    }${field.name}`;

    if (field.kind === 'composite') {
      // dont include the root of the composite type as an export path
      //   1. operation `{ products { name } }` should have the following exports:
      //      ['products.name'] and not ['products', 'products.name']
      //   2. operation `{ products { manifacturer { name } } }` should have the following exports:
      //      ['products.manifacturer.name'] and not ['products', 'products.manifacturer', 'products.manifacturer.name']
    } else {
      resolver.exports.push(path);
    }

    if (field.kind === 'composite') {
      insertResolversForGatherPlanCompositeField(
        schemaPlan,
        field,
        resolver,
        resolvingParentType
          ? pathPrefix
          : // same reasoning as above, this field is a nested field of the parent
            path + '.',
      );
    }
  }
}
