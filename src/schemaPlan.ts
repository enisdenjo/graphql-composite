import {
  ConstDirectiveNode,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  OperationTypeNode,
} from 'graphql';

export interface SchemaPlan {
  operations: Record<
    string /* OperationDefinitionNode.name */,
    SchemaPlanOperation
  >;
  compositeTypes: Record<
    string /* SchemaPlanCompositeType.name */,
    SchemaPlanCompositeType
  >;
}

export interface SchemaPlanOperation {
  name: OperationTypeNode;
  fields: Record<
    string /* SchemaPlanOperationField.name */,
    SchemaPlanOperationField
  >;
}

export interface SchemaPlanOperationField {
  name: string;
  resolvers: Record<
    string /* SchemaPlanSource.id */,
    SchemaPlanSource & SchemaPlanResolver // TODO: operation field must always have a resolver?
  >;
}

export interface SchemaPlanCompositeType {
  name: string;
  resolvers: Record<
    string /* SchemaPlanSource.id */,
    SchemaPlanSource & SchemaPlanResolver // TODO: type can only have one resolver?
  >;
  fields: Record<
    string /* SchemaPlanCompositeTypeField.name */,
    SchemaPlanCompositeTypeField
  >;
}

export interface SchemaPlanCompositeTypeField {
  name: string;
  sources: Record<
    string /* SchemaPlanSource.id */,
    (SchemaPlanSource & SchemaPlanResolver) | SchemaPlanSource // a type field may not have a resolver, assuming it's in available in the type
  >;
}

export interface SchemaPlanSource {
  /** Unique ID of the source. Usually the subgraph name. */
  id: string;
  /** Name of the type or field in the source subgraph. */
  name: string;
}

export type SchemaPlanResolver = SchemaPlanFetchResolver; // TODO: other kinds

export interface SchemaPlanFetchResolver {
  kind: 'fetch';
  operation: string;
  variables: Record<
    string /* SchemaPlanResolverVariable.name */,
    SchemaPlanResolverVariable
  >;
  /** Location of the source to be used by the resolver. */
  url: string;
}

interface SchemaPlanResolverVariable {
  name: string;
  /** Which field in the type to use as this variable. */
  select: string;
}

export function planSchema(schema: GraphQLSchema): SchemaPlan {
  const plan: SchemaPlan = { operations: {}, compositeTypes: {} };

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
          fieldPlan.resolvers[source.id] = {
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
      compositeTypePlan.resolvers[source.id] = { ...source, ...resolver };
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
        fieldPlan.sources[source.id] = { ...source, ...resolver };
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
      id: mustGetStringArgumentValue(type, field, sourceDirective, 'subgraph'),
      name: mustGetStringArgumentValue(type, field, sourceDirective, 'name'),
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
      mustGetStringArgumentValue(type, field, d, 'subgraph') === source.id,
  );
  const resolverDir = resolverDirs[0];
  if (!resolverDir) {
    if (field === fieldOrType) {
      // sources on fields must not always have a resolver
      return null;
    }
    throw new Error(
      `source "${source.id}" on type "${type.name}" has no resolver directive`,
    );
  }
  if (resolverDirs.length > 1) {
    throw new Error(
      `source "${source.id}" on type "${type.name}" has multiple resolver directives`,
    );
  }

  const variables: Record<string, SchemaPlanResolverVariable> = {};
  for (const variableDir of directives.filter(
    (d) =>
      d.name.value === 'variable' &&
      mustGetStringArgumentValue(type, field, d, 'subgraph') === source.id,
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

  return {
    url: '', // TODO: source url
    kind: 'fetch',
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
