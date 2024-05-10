import { OperationTypeNode } from 'graphql';
import { GatherPlanResolver } from './gather.js';

export interface SchemaPlan {
  /** The GraphQL schema SDL without directives. */
  schema: string;
  operations: {
    [name: string /* graphql.OperationDefinitionNode */]: SchemaPlanOperation;
  };
  compositeTypes: {
    [name in SchemaPlanCompositeType['name']]: SchemaPlanCompositeType;
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
    [name in SchemaPlanSubgraph['name']]: SchemaPlanSubgraph &
      SchemaPlanResolver; // TODO: operation field must always have a resolver?
  };
}

export interface SchemaPlanCompositeType {
  name: string;
  resolvers: {
    [name in SchemaPlanSubgraph['name']]: SchemaPlanSubgraph &
      SchemaPlanCompositeResolver; // TODO: type can only have one resolver at subgraph?
  };
  fields: {
    [name in SchemaPlanCompositeTypeField['name']]: SchemaPlanCompositeTypeField;
  };
}

export interface SchemaPlanCompositeTypeField {
  name: string;
  subgraphs: string[];
}

export interface SchemaPlanSubgraph {
  /** Unique identifier of the subgraph source. Usually the name. */
  name: string;
}

export type SchemaPlanResolver =
  | SchemaPlanCompositeResolver
  | SchemaPlanScalarResolver;

export interface SchemaPlanCompositeResolver {
  kind: 'composite';
  /** The type resolved. */
  type: string;
  /**
   * Concrete/unwrapped composite type of the {@link type resolved type}.
   * Is actually the type of the `__export` fragment.
   *
   * For example, the type is `Product` if the {@link type resolved type} is:
   *   - `Product`
   *   - `Product!`
   *   - `[Product]!`
   *   - `[Product!]`
   *   - `[Product!]!`
   */
  ofType: string;
  /**
   * Operation to execute on the subgraph. The operation **must** include
   * a spread of the `__export` fragment which will have the fields populated
   * during the gather phase.
   *
   * A well-formatted operation like this in the {@link SchemaPlanFetchResolver}:
   * ```graphql
   * query ProductByUPC($upc: ID!) { product(upc: $upc) { ...__export } }
   * ```
   * will be populated by the necessary fields during gather at the {@link GatherPlanResolver} like this:
   * ```graphql
   * query ProductByUPC($upc: ID!) { product(upc: $upc) { ...__export } }
   * fragment __export on Product { upc name manufacturer { id } }
   * ```
   *
   */
  operation: string;
  variables: {
    [name in SchemaPlanResolverVariable['name']]: SchemaPlanResolverVariable;
  };
}

export interface SchemaPlanScalarResolver {
  kind: 'scalar';
  /** The type resolved. */
  type: string;
  /**
   * Concrete/unwrapped type of the {@link type resolved type}.
   *
   * For example, the type is `String` if the {@link type resolved type} is:
   *   - `String`
   *   - `String!`
   *   - `[String]!`
   *   - `[String!]`
   *   - `[String!]!`
   */
  ofType: string;
  /**
   * Operation to execute on the subgraph. The operation's deepest
   * field is where the scalar is located.
   *
   * A well-formatted operation looks like this:
   * ```graphql
   * query ProductNameUPC($upc: ID!) { product(upc: $upc) { name } }
   * ```
   *
   */
  operation: string;
  variables: {
    [name in SchemaPlanResolverVariable['name']]: SchemaPlanResolverVariable;
  };
}

export type SchemaPlanResolverVariable =
  | SchemaPlanResolverUserVariable
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

/** Variable that is selected from the resolving type. */
export interface SchemaPlanResolverSelectVariable {
  kind: 'select';
  /** Name of the variable to use in the resolver's operation. */
  name: string;
  /** Which field in the type to use (select) as this variable. */
  select: string;
}
