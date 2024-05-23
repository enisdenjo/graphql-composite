import { OperationTypeNode } from 'graphql';
import { GatherPlanResolver } from './gather.js';

export interface Blueprint {
  /** The GraphQL schema SDL without directives. */
  schema: string;
  operations: {
    [name: string /* graphql.OperationDefinitionNode */]: BlueprintOperation;
  };
  objects: {
    [name in BlueprintObject['name']]: BlueprintObject;
  };
}

export interface BlueprintOperation {
  name: OperationTypeNode;
  fields: {
    [name in BlueprintOperationField['name']]: BlueprintOperationField;
  };
}

export interface BlueprintOperationField {
  name: string;
  resolvers: {
    [subgraph in BlueprintSubgraph['subgraph']]: BlueprintSubgraph &
      BlueprintResolver; // TODO: operation field must always have a resolver?
  };
}

export interface BlueprintObject {
  name: string;
  resolvers: {
    [subgraph in BlueprintSubgraph['subgraph']]: BlueprintSubgraph &
      BlueprintCompositeResolver; // TODO: type can only have one resolver at subgraph?
  };
  fields: {
    [name in BlueprintObjectField['name']]: BlueprintObjectField;
  };
}

export interface BlueprintObjectField {
  name: string;
  subgraphs: string[];
}

export interface BlueprintSubgraph {
  /** Unique identifier of the subgraph source. Usually the name. */
  subgraph: string;
}

export type BlueprintResolver =
  | BlueprintCompositeResolver
  | BlueprintScalarResolver;

export interface BlueprintCompositeResolver {
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
   * A well-formatted operation like this in the {@link BlueprintFetchResolver}:
   * ```graphql
   * query ProductByUPC($upc: ID!) { product(upc: $upc) { ...__export } }
   * ```
   * will be populated by the necessary fields during gather at the {@link GatherPlanResolver} like this:
   * ```graphql
   * query ProductByUPC($upc: ID!) { product(upc: $upc) { ... on Product { upc name manufacturer { id } } } }
   * ```
   */
  operation: string;
  variables: {
    [name in BlueprintResolverVariable['name']]: BlueprintResolverVariable;
  };
}

export interface BlueprintScalarResolver {
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
    [name in BlueprintResolverVariable['name']]: BlueprintResolverVariable;
  };
}

export type BlueprintResolverVariable =
  | BlueprintResolverUserVariable
  | BlueprintResolverSelectVariable;

/**
 * Variable that must be provided by the user with the name as the key.
 * Either inline or an operation variable.
 */
export interface BlueprintResolverUserVariable {
  kind: 'user';
  /** Name of the variable to use in the resolver's operation. */
  name: string;
}

/** Variable that is selected from the resolving type. */
export interface BlueprintResolverSelectVariable {
  kind: 'select';
  /** Name of the variable to use in the resolver's operation. */
  name: string;
  /** Which field in the type to use (select) as this variable. */
  select: string;
}
