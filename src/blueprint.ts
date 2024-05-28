import { OperationTypeNode } from 'graphql';
import { GatherPlanResolver } from './gather.js';

export interface Blueprint {
  /** The GraphQL schema SDL without directives. */
  schema: string;
  operations: {
    [name: string /* graphql.OperationDefinitionNode */]: BlueprintOperation;
  };
  types: {
    [name in BlueprintType['name']]: BlueprintType;
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
    [subgraph in BlueprintResolver['subgraph']]: BlueprintTypeResolver; // TODO: operation field always has one resolver per subgraph?
  };
}

export type BlueprintType = BlueprintInterface | BlueprintObject;

export interface BlueprintInterface {
  kind: 'interface';
  name: string;
  resolvers: {
    [subgraph in BlueprintInterfaceResolver['subgraph']]: BlueprintInterfaceResolver[];
  };
  fields: {
    [name in BlueprintField['name']]: BlueprintField;
  };
}

export interface BlueprintObject {
  kind: 'object';
  name: string;
  /** List of {@link BlueprintInterface.name interface name}s this type implements, if any. */
  implements: BlueprintInterface['name'][];
  resolvers: {
    [subgraph in BlueprintObjectResolver['subgraph']]: BlueprintObjectResolver[];
  };
  fields: {
    [name in BlueprintField['name']]: BlueprintField;
  };
}

export interface BlueprintField {
  /** Name of the field in a {@link BlueprintType}. */
  name: string;
  /** List of subgraphs at which the field is available. */
  subgraphs: string[];
}

export interface BlueprintResolver {
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
    [name in BlueprintResolverVariable['name']]: BlueprintResolverVariable;
  };
}

export interface BlueprintInterfaceResolver extends BlueprintResolver {
  kind: 'interface';
  /**
   * Contains the list of {@link BlueprintType.name type names} which implement
   * this interface that can be resolved by this resolver.
   *
   * If the list is empty, it means that only the interface can be resolved and none
   * of the implementing types.
   */
  resolvableTypes: string[];
}

export interface BlueprintObjectResolver extends BlueprintResolver {
  kind: 'object';
}

export type BlueprintCompositeResolver =
  | BlueprintInterfaceResolver
  | BlueprintObjectResolver;

export interface BlueprintScalarResolver extends BlueprintResolver {
  kind: 'scalar';
}

export type BlueprintTypeResolver =
  | BlueprintInterfaceResolver
  | BlueprintObjectResolver
  | BlueprintScalarResolver;

export type BlueprintResolverVariable =
  | BlueprintResolverUserVariable
  | BlueprintResolverConstantVariable
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

/**
 * Variable that is constant.
 * Is also used when a user's query provides inline variables for fields,
 * the inline variables will be converted to a resolver constant variable.
 */
export interface BlueprintResolverConstantVariable {
  kind: 'constant';
  /** Name of the variable to use in the resolver's operation. */
  name: string;
  /** The value of the constant. */
  value: unknown;
}

/** Variable that is selected from the resolving type. */
export interface BlueprintResolverSelectVariable {
  kind: 'select';
  /** Name of the variable to use in the resolver's operation. */
  name: string;
  /** Which field in the type to use (select) as this variable. */
  select: string;
}

export function isBlueprintResolverSelectVariable(
  v: BlueprintResolverVariable,
): v is BlueprintResolverSelectVariable {
  return v.kind === 'select';
}
