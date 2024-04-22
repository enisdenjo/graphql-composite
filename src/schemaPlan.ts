import {
  ConstDirectiveNode,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
} from 'graphql';

export interface SchemaPlan {
  types: Record<string, SchemaPlanType>;
}

export interface SchemaPlanType {
  sources: [SchemaPlanSource, SchemaPlanResolver][];
  fields: SchemaPlanField[];
}

export interface SchemaPlanField {
  sources: [SchemaPlanSource, SchemaPlanResolver | null][];
  name: string;
}

export interface SchemaPlanSource {
  /** Unique subgraph name. */
  subgraph: string;
  /** Name of the type or field in the source subgraph. */
  name: string;
}

export interface SchemaPlanResolver {
  operation: string;
  kind: 'FETCH';
  variables: Variable[];
}

interface Variable {
  name: string;
  /** Which field in the type to use as this variable. */
  select: string;
}

export function planSchema(schema: GraphQLSchema): SchemaPlan {
  const plan: SchemaPlan = { types: {} };

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

    const planType: SchemaPlanType = {
      sources: [],
      fields: [],
    };

    for (const source of getSourcesFromDirectives(type, null)) {
      const resolver = getResolverForSourceFromDirectives(type, null, source);
      planType.sources.push([source, resolver]);
    }

    for (const [name, field] of Object.entries(type.getFields())) {
      const planField: SchemaPlanField = {
        sources: [],
        name,
      };

      for (const source of getSourcesFromDirectives(type, field)) {
        const resolver = getResolverForSourceFromDirectives(
          type,
          field,
          source,
        );
        planField.sources.push([source, resolver]);
      }

      planType.fields.push(planField);
    }

    plan.types[type.name] = planType;
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
      subgraph: mustGetStringArgumentValue(
        type,
        field,
        sourceDirective,
        'subgraph',
      ),
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
      mustGetStringArgumentValue(type, field, d, 'subgraph') ===
        source.subgraph,
  );
  const resolverDir = resolverDirs[0];
  if (!resolverDir) {
    if (field === fieldOrType) {
      // sources on fields must not always have a resolver
      return null;
    }
    throw new Error(
      `source "${source.subgraph}" on type "${type.name}" has no resolver directive`,
    );
  }
  if (resolverDirs.length > 1) {
    throw new Error(
      `source "${source.subgraph}" on type "${type.name}" has multiple resolver directives`,
    );
  }

  const variables: Variable[] = [];
  for (const variableDir of directives.filter(
    (d) =>
      d.name.value === 'variable' &&
      mustGetStringArgumentValue(type, field, d, 'subgraph') ===
        source.subgraph,
  )) {
    variables.push({
      name: mustGetStringArgumentValue(type, field, variableDir, 'name'),
      select: mustGetStringArgumentValue(type, field, variableDir, 'select'),
    });
  }

  return {
    kind: 'FETCH', // TODO: other kinds
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
