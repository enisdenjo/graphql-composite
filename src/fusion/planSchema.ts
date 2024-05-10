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
  SchemaPlanSource,
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
        for (const source of getSourcesFromDirectives(type, field)) {
          const resolver = getResolverForSourceFromDirectives(
            type,
            field,
            source,
          );
          if (!resolver) {
            throw new Error(
              `Operation field "${field.name}" must have a resolver`,
            );
          }
          fieldPlan.resolvers[source.source] = {
            ...source,
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
    for (const source of getSourcesFromDirectives(type, null)) {
      const resolver = getResolverForSourceFromDirectives(type, null, source);
      if (resolver.kind === 'scalar') {
        throw new Error(
          `Composite type plan for "${type.name}" cannot have a scalar resolver`,
        );
      }
      compositeTypePlan.resolvers[source.source] = { ...source, ...resolver };
    }
    for (const [name, field] of Object.entries(type.getFields())) {
      const fieldPlan: SchemaPlanCompositeTypeField = {
        name,
        sources: {},
      };
      for (const source of getSourcesFromDirectives(type, field)) {
        const resolver = getResolverForSourceFromDirectives(
          type,
          field,
          source,
        );
        fieldPlan.sources[source.source] = { ...source, ...resolver };
      }
      compositeTypePlan.fields[fieldPlan.name] = fieldPlan;
    }
    plan.compositeTypes[type.name] = compositeTypePlan;
  }

  return plan;
}

/**
 * Gets the sources of either the `field`, if provided, or the `type`.
 * Both arguments are used to better the error messages.
 */
function getSourcesFromDirectives(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown, unknown> | null,
): SchemaPlanSource[] {
  const fieldOrType = field || type;
  const sources: SchemaPlanSource[] = [];
  for (const sourceDirective of fieldOrType.astNode?.directives?.filter(
    (d) => d.name.value === 'source',
  ) || []) {
    // TODO: make sure source doesnt already exist
    sources.push({
      source: mustGetStringArgumentValue(
        type,
        field,
        sourceDirective,
        'subgraph',
      ),
    });
  }
  return sources;
}

/**
 * Gets the resolver of the source in either the `field`, if provided, or the `type`.
 * Both arguments are used to better the error messages.
 */
function getResolverForSourceFromDirectives(
  type: GraphQLObjectType,
  field: null,
  source: SchemaPlanSource,
): SchemaPlanResolver;
function getResolverForSourceFromDirectives(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown, unknown>,
  source: SchemaPlanSource,
): SchemaPlanResolver | null;
function getResolverForSourceFromDirectives(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown, unknown> | null,
  source: SchemaPlanSource,
): SchemaPlanResolver | null {
  const fieldOrType = field || type;
  const directives = fieldOrType.astNode?.directives || [];
  const resolverDirs = directives.filter(
    (d) =>
      d.name.value === 'resolver' &&
      mustGetStringArgumentValue(type, field, d, 'subgraph') === source.source,
  );
  const resolverDir = resolverDirs[0];
  if (!resolverDir) {
    if (field === fieldOrType) {
      // sources on fields must not always have a resolver
      return null;
    }
    throw new Error(
      `source "${source.source}" on type "${type.name}" has no resolver directive`,
    );
  }
  if (resolverDirs.length > 1) {
    throw new Error(
      `source "${source.source}" on type "${type.name}" has multiple resolver directives`,
    );
  }

  const variables: Record<string, SchemaPlanResolverVariable> = {};
  for (const variableDir of directives.filter(
    (d) =>
      d.name.value === 'variable' &&
      mustGetStringArgumentValue(type, field, d, 'subgraph') === source.source,
  )) {
    const variable: SchemaPlanResolverVariable = {
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
  const resolvingType = getNamedType(field ? field.type : type);

  return {
    kind: isScalarType(resolvingType) ? 'scalar' : 'composite',
    type: resolvingType.name,
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
  const arg = directive.arguments?.find((s) => s.name.value === name)?.value;
  if (!arg) {
    throw new Error(
      `directive @${directive.name.value} on type "${type.name}"${field ? ` at field "${field.name}"` : ''} doesnt have an "${name}" argument`,
    );
  }
  if (arg.kind !== Kind.STRING) {
    throw new Error(
      `directive @${directive.name.value} on type "${type.name}"${field ? ` at field "${field.name}"` : ''} argument "${name}" is not a string`,
    );
  }
  return arg.value;
}
