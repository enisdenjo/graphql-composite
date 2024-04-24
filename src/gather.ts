import {
  DocumentNode,
  GraphQLCompositeType,
  GraphQLEnumType,
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
import {
  planSchema,
  SchemaPlan,
  SchemaPlanResolver,
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
   * Dot notation flat list of field paths to add to the `export`
   * fragment on the query. They're also the exported fields of this resolver.
   */
  export: string[];
  /**
   * Other resolvers that depend on fields from this resolver.
   * These are often resolvers of fields that don't exist in the resolver.
   */
  includes: GatherPlanResolver[];
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
      throw 'TODO';
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
          export: [],
          includes: [],
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
        resolver.export.push(field.name);
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
      : parentResolver.includes.find((r) => fieldPlan.sources[r.id]);
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

      for (const { select } of Object.values(resolverPlan.variables)) {
        // make sure parent resolver - the one that {@link GatherPlanResolver.includes} this
        // one - exports fields that are needed as variables to perform the resolution
        const path = `${pathPrefix}${parent.name}.${select}`;
        const need = parentResolver.export.find((e) => e === path);
        if (!need) {
          // TODO: disallow pushing same path multiple times
          // TODO: what happens if the parent source cannot resolve this field?
          parentResolver.export.push(path);
        }
      }

      resolver = { ...resolverPlan, export: [], includes: [] };
      parentResolver.includes.push(resolver);
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
      resolver.export.push(path);
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
