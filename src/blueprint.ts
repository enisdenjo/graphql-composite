import { GatherPlanResolver } from './gather.js';

export interface Blueprint {
  /** The GraphQL schema SDL without directives. */
  schema: string;
  types: {
    [name in BlueprintType['name']]: BlueprintType;
  };
}

export type BlueprintType = BlueprintInterface | BlueprintObject;

export interface BlueprintInterface {
  kind: 'interface';
  name: string;
  fields: {
    [name in BlueprintField['name']]: BlueprintField;
  };
  resolvers?: {
    [subgraph in BlueprintInterfaceResolver['subgraph']]: BlueprintInterfaceResolver[];
  };
}

export interface BlueprintObject {
  kind: 'object';
  name: string;
  /** Map of {@link BlueprintInterface.name interface name}s this type implements, if any. */
  implements?: {
    [name in BlueprintInterface['name']]: BlueprintImplements;
  };
  fields: {
    [name in BlueprintField['name']]: BlueprintField;
  };
  resolvers?: {
    [subgraph in BlueprintObjectResolver['subgraph']]: BlueprintObjectResolver[];
  };
}

export interface BlueprintImplements {
  name: string;
  subgraphs: string[];
}

/** The {@link BlueprintField field} information in a subgraph. */
export interface BlueprintFieldSubgraph {
  /** Unique identifier of a specific subgraph. */
  subgraph: string;
  /** The type of the field in the {@link subgraph}. */
  type: string;
  /**
   * Additional fields of {@link BlueprintType this field's type} the
   * subgraph can provide when selected.
   */
  provides?: string[];
}

export interface BlueprintField {
  /** Name of the field in a {@link BlueprintType}. */
  name: string;
  /** Subgraphs at which the field is available. */
  subgraphs: {
    [subgraph in BlueprintFieldSubgraph['subgraph']]: BlueprintFieldSubgraph;
  };
  /**
   * The resolver for this specific field.
   * Required in `Query` and `Mutation` {@link BlueprintType types}.
   *
   * TODO: field always has one resolver per subgraph?
   */
  resolvers?: {
    [subgraph in BlueprintTypeResolver['subgraph']]: BlueprintTypeResolver;
  };
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
}

export interface BlueprintObjectResolver extends BlueprintResolver {
  kind: 'object';
}

export type BlueprintCompositeResolver =
  | BlueprintInterfaceResolver
  | BlueprintObjectResolver;

export interface BlueprintPrimitiveResolver extends BlueprintResolver {
  kind: 'primitive';
}

export type BlueprintTypeResolver =
  | BlueprintInterfaceResolver
  | BlueprintObjectResolver
  | BlueprintPrimitiveResolver;

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

/**
 * Gets all subgraphs at which the given type is available.
 *
 * The availability is derived by distinctly finding all subgraphs of
 * {@link BlueprintType.fields fields} in {@link type}.
 */
export function allSubgraphsForType(type: BlueprintType): string[] {
  const availableIn: Record<string, null> = {}; // we use a map to avoid duplicates
  for (const f of Object.values(type.fields)) {
    Object.keys(f.subgraphs).forEach((s) => (availableIn[s] = null));
  }
  return Object.keys(availableIn);
}
