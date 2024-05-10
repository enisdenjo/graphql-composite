import {
  ConstDirectiveNode,
  getNamedType,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
  isScalarType,
  Kind,
  OperationTypeNode,
  printSchema,
} from 'graphql';
import {
  SchemaPlan,
  SchemaPlanCompositeType,
  SchemaPlanCompositeTypeField,
  SchemaPlanOperation,
  SchemaPlanOperationField,
  SchemaPlanResolver,
  SchemaPlanResolverVariable,
} from '../schemaPlan.js';

export function planSchema(schema: GraphQLSchema): SchemaPlan {
  const plan: SchemaPlan = {
    schema: printSchema(schema),
    operations: {},
    compositeTypes: {},
  };

  const types = schema.getTypeMap();

  for (const [name, type] of Object.entries(types)) {
    if (name.startsWith('__')) {
      // ignore introspection types
      continue;
    }
    if (!(type instanceof GraphQLObjectType)) {
      // ignore non object types
      continue;
    }

    if (
      type.name === 'Query' ||
      type.name === 'Mutation' ||
      type.name === 'Subscription'
    ) {
      // operations
      const name = type.name.toLowerCase() as OperationTypeNode;
      const operation: SchemaPlanOperation = {
        name: name,
        fields: {},
      };
      for (const [name, field] of Object.entries(type.getFields())) {
        const fieldPlan: SchemaPlanOperationField = {
          name,
          resolvers: {},
        };
        for (const subgraph of getSubgraphsFromDirectives(type, field)) {
          const resolver = getResolverForSubgraphFromDirectives(
            type,
            field,
            subgraph,
          );
          if (!resolver) {
            throw new Error(
              `Operation field "${field.name}" must have a resolver`,
            );
          }
          fieldPlan.resolvers[subgraph] = {
            name: subgraph,
            ...resolver,
          };
        }
        operation.fields[fieldPlan.name] = fieldPlan;
      }
      plan.operations[name] = operation;
      continue;
    }

    // compositeTypes
    const compositeTypePlan: SchemaPlanCompositeType = {
      name: type.name,
      fields: {},
      resolvers: {},
    };
    for (const subgraph of getSubgraphsFromDirectives(type, null)) {
      const resolver = getResolverForSubgraphFromDirectives(
        type,
        null,
        subgraph,
      );
      if (resolver.kind === 'scalar') {
        throw new Error(
          `Composite type plan for "${type.name}" cannot have a scalar resolver`,
        );
      }
      compositeTypePlan.resolvers[subgraph] = {
        name: subgraph,
        ...resolver,
      };
    }
    for (const [name, field] of Object.entries(type.getFields())) {
      const fieldPlan: SchemaPlanCompositeTypeField = {
        name,
        subgraphs: {},
      };
      for (const subgraph of getSubgraphsFromDirectives(type, field)) {
        const resolver = getResolverForSubgraphFromDirectives(
          type,
          field,
          subgraph,
        );
        fieldPlan.subgraphs[subgraph] = { subgraph, ...resolver };
      }
      compositeTypePlan.fields[fieldPlan.name] = fieldPlan;
    }
    plan.compositeTypes[type.name] = compositeTypePlan;
  }

  return plan;
}

/**
 * Gets the subgraphs of either the `field`, if provided, or the `type`.
 * Both arguments are used to better the error messages.
 */
function getSubgraphsFromDirectives(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown, unknown> | null,
): string[] {
  const fieldOrType = field || type;
  const subgraphs: string[] = [];
  for (const sourceDirective of fieldOrType.astNode?.directives?.filter(
    (d) => d.name.value === 'source',
  ) || []) {
    // TODO: make sure subgraph doesnt already exist
    subgraphs.push(
      mustGetStringArgumentValue(type, field, sourceDirective, 'subgraph'),
    );
  }
  return subgraphs;
}

/**
 * Gets the resolver of the subgraph in either the `field`, if provided, or the `type`.
 * Both arguments are used to better the error messages.
 */
function getResolverForSubgraphFromDirectives(
  type: GraphQLObjectType,
  field: null,
  subgraph: string,
): SchemaPlanResolver;
function getResolverForSubgraphFromDirectives(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown, unknown>,
  subgraph: string,
): SchemaPlanResolver | null;
function getResolverForSubgraphFromDirectives(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown, unknown> | null,
  subgraph: string,
): SchemaPlanResolver | null {
  const fieldOrType = field || type;
  const directives = fieldOrType.astNode?.directives || [];
  const resolverDirs = directives.filter(
    (d) =>
      d.name.value === 'resolver' &&
      mustGetStringArgumentValue(type, field, d, 'subgraph') === subgraph,
  );
  const resolverDir = resolverDirs[0];
  if (!resolverDir) {
    if (field === fieldOrType) {
      // sources on fields must not always have a resolver
      return null;
    }
    throw new Error(
      `Subgraph "${subgraph}" on type "${type.name}" has no resolver directive`,
    );
  }
  if (resolverDirs.length > 1) {
    throw new Error(
      `Subgraph "${subgraph}" on type "${type.name}" has multiple resolver directives`,
    );
  }

  const variables: Record<string, SchemaPlanResolverVariable> = {};
  for (const variableDir of directives.filter(
    (d) => d.name.value === 'variable',
  )) {
    const subgraphArg = getStringArgumentValue(
      type,
      field,
      variableDir,
      'subgraph',
    );
    if (!subgraphArg) {
      const variable: SchemaPlanResolverVariable = {
        kind: 'user',
        name: mustGetStringArgumentValue(type, field, variableDir, 'name'),
      };
      if (variables[variable.name]) {
        throw new Error(
          `Variable "${variable.name}" on type "${type.name}" already defined`,
        );
      }
      variables[variable.name] = variable;
    }
    if (subgraphArg !== subgraph) {
      continue;
    }
    const variable: SchemaPlanResolverVariable = {
      kind: 'select',
      name: mustGetStringArgumentValue(type, field, variableDir, 'name'),
      select: mustGetStringArgumentValue(type, field, variableDir, 'select'),
    };
    if (variables[variable.name]) {
      throw new Error(
        `Variable "${variable.name}" on type "${type.name}" already defined`,
      );
    }
    variables[variable.name] = variable;
  }

  // when resolving a field, then its type is the one being resolved by the resolver
  // otherwise its the type (the resolver is directly on a type in that case)
  const ofType = getNamedType(field ? field.type : type);

  return {
    kind: isScalarType(ofType) ? 'scalar' : 'composite',
    type: String(field ? field.type : type),
    ofType: ofType.name,
    operation: mustGetStringArgumentValue(
      type,
      field,
      resolverDir,
      'operation',
    ),
    variables,
  };
}

function mustGetStringArgumentValue(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown, unknown> | null,
  directive: ConstDirectiveNode,
  name: string,
): string {
  const val = getStringArgumentValue(type, field, directive, name);
  if (!val) {
    throw new Error(
      `directive @${directive.name.value} on type "${type.name}"${field ? ` at field "${field.name}"` : ''} doesnt have an "${name}" argument`,
    );
  }
  return val;
}

function getStringArgumentValue(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown, unknown> | null,
  directive: ConstDirectiveNode,
  name: string,
): string | null {
  const arg = directive.arguments?.find((s) => s.name.value === name)?.value;
  if (!arg) {
    return null;
  }
  if (arg.kind !== Kind.STRING) {
    throw new Error(
      `directive @${directive.name.value} on type "${type.name}"${field ? ` at field "${field.name}"` : ''} argument "${name}" is not a string`,
    );
  }
  return arg.value;
}
