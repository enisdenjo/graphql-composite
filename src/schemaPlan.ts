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
    [source in SchemaPlanSource['source']]: SchemaPlanSource &
      SchemaPlanResolver; // TODO: operation field must always have a resolver?
  };
}

export interface SchemaPlanCompositeType {
  name: string;
  resolvers: {
    [source in SchemaPlanSource['source']]: SchemaPlanSource &
      SchemaPlanCompositeResolver; // TODO: type can only have one resolver at source?
  };
  fields: {
    [name in SchemaPlanCompositeTypeField['name']]: SchemaPlanCompositeTypeField;
  };
}

export interface SchemaPlanCompositeTypeField {
  name: string;
  sources: {
    [source in SchemaPlanSource['source']]:
      | (SchemaPlanSource & SchemaPlanResolver)
      | SchemaPlanSource; // a type field may not have a resolver, assuming it's in available in the type
  };
}

export interface SchemaPlanSource {
  /** Unique identifier of the source. Usually the subgraph name. */
  source: string;
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
   * Operation to execute on the source. The operation **must** include
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
   * Operation to execute on the source. The operation's deepest
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
  | SchemaPlanResolverSelectVariable
  | SchemaPlanResolverConstantVariable;

export interface SchemaPlanResolverSelectVariable {
  /** Name of the variable to use in the related operation. */
  name: string;
  /** Which field in the type to use (select) as this variable. */
  select: string;
}

export interface SchemaPlanResolverConstantVariable {
  /** Name of the variable to use in the related operation. */
  name: string;
  /** The hard-coded (constant) value to use as this variable. */
  constant: unknown;
}
