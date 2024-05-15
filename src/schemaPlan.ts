import { OperationTypeNode } from 'graphql';
import { GatherPlanResolver } from './gather.js';

export interface SchemaPlan {
  /** The GraphQL schema SDL without directives. */
  schema: string;
  operations: {
    [name: string /* graphql.OperationDefinitionNode */]: SchemaPlanOperation;
  };
  types: {
    [name in SchemaPlanType['name']]: SchemaPlanType;
  };
}

export interface SchemaPlanOperation {
  name: OperationTypeNode;
  fields: {
    [name in SchemaPlanOperationField['name']]: SchemaPlanOperationField;
  };
}

export interface SchemaPlanOperationField {
  name: string;
  resolvers: {
    [subgraph in SchemaPlanResolver['subgraph']]: SchemaPlanAnyResolver; // TODO: operation field must always have a resolver?
  };
}

export type SchemaPlanType = SchemaPlanInterface | SchemaPlanObject;

export interface SchemaPlanInterface {
  kind: 'interface';
  name: string;
  resolvers: {
    [subgraph in SchemaPlanInterfaceResolver['subgraph']]: SchemaPlanInterfaceResolver; // TODO: type can only have one resolver at subgraph?
  };
  fields: {
    [name in SchemaPlanField['name']]: SchemaPlanField;
  };
}

export interface SchemaPlanObject {
  kind: 'object';
  name: string;
  /** List of interface names this type implements, if any. */
  implements: SchemaPlanInterface['name'][];
  resolvers: {
    [subgraph in SchemaPlanObjectResolver['subgraph']]: SchemaPlanObjectResolver; // TODO: type can only have one resolver at subgraph?
  };
  fields: {
    [name in SchemaPlanField['name']]: SchemaPlanField;
  };
}

export interface SchemaPlanField {
  name: string;
  subgraphs: string[];
}

export interface SchemaPlanResolver {
  /** Unique identifier of a specific subgraph. */
  subgraph: string;
  /** The type resolved. */
  type: string;
  /**
   * Unwrapped type of the {@link type resolved type}.
   *
   * For example, it'll be `Product` if the {@link type resolved type} is:
   *   - `Product`
   *   - `Product!`
   *   - `[Product]!`
   *   - `[Product!]`
   *   - `[Product!]!`
   *
   * *_Same logic applies for `scalar` {@link kind}._
   */
  ofType: string;
  /**
   * Operation to execute on the subgraph.
   *
   * The operation **must** include a spread of the `__export` fragment if the
   * {@link kind} is either `interface` or `object`. Otherwise, the operation's deepest
   * field is where the `scalar` is located.
   *
   * ---
   *
   * A well-formatted operation for `interface` and `object` {@link kind} is:
   * ```graphql
   * query ProductByUPC($upc: ID!) { product(upc: $upc) { ...__export } }
   * ```
   * will be populated by the necessary fields during gather at the {@link GatherPlanResolver} like this:
   * ```graphql
   * query ProductByUPC($upc: ID!) { product(upc: $upc) { ... on Product { upc name manufacturer { id } } } }
   * ```
   *
   * ---
   *
   * A well-formatted operation for `scalar` {@link kind} is:
   * ```graphql
   * query ProductNameByUPC($upc: ID!) { product(upc: $upc) { name } }
   * ```
   */
  operation: string;
  /** Necessary variables for performing the {@link operation}. */
  variables: {
    [name in SchemaPlanResolverVariable['name']]: SchemaPlanResolverVariable;
  };
}

export interface SchemaPlanInterfaceResolver extends SchemaPlanResolver {
  kind: 'interface';
}

export interface SchemaPlanObjectResolver extends SchemaPlanResolver {
  kind: 'object';
}

export interface SchemaPlanCompositeResolver extends SchemaPlanResolver {
  kind: 'interface' | 'object';
}

export interface SchemaPlanScalarResolver extends SchemaPlanResolver {
  kind: 'scalar';
}

export type SchemaPlanAnyResolver =
  | SchemaPlanInterfaceResolver
  | SchemaPlanObjectResolver
  | SchemaPlanScalarResolver;

export type SchemaPlanResolverVariable =
  | SchemaPlanResolverUserVariable
  | SchemaPlanResolverConstantVariable
  | SchemaPlanResolverSelectVariable;

/**
 * Variable that must be provided by the user with the name as the key.
 * Either inline or an operation variable.
 */
export interface SchemaPlanResolverUserVariable {
  kind: 'user';
  /** Name of the variable to use in the resolver's operation. */
  name: string;
}

/**
 * Variable that is constant.
 * Is also used when a user's query provides inline variables for fields,
 * the inline variables will be converted to a resolver constant variable.
 */
export interface SchemaPlanResolverConstantVariable {
  kind: 'constant';
  /** Name of the variable to use in the resolver's operation. */
  name: string;
  /** The value of the constant. */
  value: unknown;
}

/** Variable that is selected from the resolving type. */
export interface SchemaPlanResolverSelectVariable {
  kind: 'select';
  /** Name of the variable to use in the resolver's operation. */
  name: string;
  /** Which field in the type to use (select) as this variable. */
  select: string;
}

export function isSchemaPlanResolverSelectVariable(
  v: SchemaPlanResolverVariable,
): v is SchemaPlanResolverSelectVariable {
  return v.kind === 'select';
}
