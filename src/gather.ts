import {
  ASTNode,
  buildSchema,
  DocumentNode,
  getNamedType,
  isCompositeType,
  Kind,
  OperationTypeNode,
  parse,
  print,
  SelectionNode,
  SelectionSetNode,
  TypeInfo,
  valueFromAST,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import {
  SchemaPlan,
  SchemaPlanCompositeResolver,
  SchemaPlanField,
  SchemaPlanScalarResolver,
} from './schemaPlan.js';
import { flattenFragments } from './utils.js';

export interface GatherPlan {
  query: string;
  operations: GatherPlanOperation[];
}

export interface GatherPlanOperation {
  /** The name of the operation to execute. */
  name: string | null;
  type: OperationTypeNode;
  /** A map of operation field paths to the necessary operation resolver. */
  resolvers: Record<string, GatherPlanResolver>;
}

export type GatherPlanResolver =
  | GatherPlanCompositeResolver
  | GatherPlanScalarResolver;

export interface GatherPlanCompositeResolver
  extends SchemaPlanCompositeResolver {
  /**
   * The field in user's operation this resolver resolves
   * at the location of this resolver in the structure.
   */
  field: GatherPlanResolverField;
  /** The path to the `__export` fragment in the execution result. */
  pathToExportData: string[];
  /** The exports of the resolver that are to be available for the
   * includes; and, when `public` {@link GatherPlanCompositeResolverExport.kind kind},
   * also in the final result for the user.
   */
  exports: GatherPlanCompositeResolverExport[];
  /**
   * Other resolvers that depend on fields from this resolver.
   * These are often resolvers of fields that don't exist in the resolver.
   *
   * A map of field paths to the necessary resolver.
   *
   * Only composite resolvers can include composite resolvers.
   */
  includes: Record<string, GatherPlanCompositeResolver>;
}

export type GatherPlanCompositeResolverExport =
  | GatherPlanCompositeResolverExportField
  | GatherPlanCompositeResolverExportFragment;

export interface GatherPlanCompositeResolverExportField {
  /**
   * Whether the export is public or private.
   *
   * `public` exports are are also available in the final result for the user,
   * while `private` exports are not available to the user. They're often used
   * when parent has to resolve additional fields for its includes.
   */
  kind: 'private' | 'public';
  /** Name of the field. */
  name: string;
  /** Nested selections of the export. */
  selections?: GatherPlanCompositeResolverExport[];
}

export interface GatherPlanCompositeResolverExportFragment {
  /**
   * Whether the export is public or private.
   *
   * `public` exports are are also available in the final result for the user,
   * while `private` exports are not available to the user. They're often used
   * when parent has to resolve additional fields for its includes.
   */
  kind: 'private' | 'public';
  /**
   * The type of the parent for this selection.
   * Will be used as inline fragment type when rendering.
   */
  type: string;
  /** Nested selections of the export. */
  selections: GatherPlanCompositeResolverExport[];
}

export interface GatherPlanScalarResolver extends SchemaPlanScalarResolver {
  /**
   * The field in user's operation this resolver resolves
   * at the location of this resolver in the structure.
   */
  field: GatherPlanResolverField;
  /**
   * The path to the scalar in the execution result.
   */
  pathToExportData: string[];
}

export interface GatherPlanResolverAnyField {
  kind: 'scalar' | 'composite';
  /** Dot-notation path to the field in user's operation. */
  path: string;
  /**
   * The name of the field in user's operation.
   * It matches the last part of {@link path field's path}.
   */
  name: string;
  /**
   * The type of this field's parent. Useful for fragments spread
   * within interfaces.
   *
   * If you have a query:
   * ```graphql
   * {
   *   animal(name: "Cathew") {
   *     name
   *     ... on Cat {
   *       meows
   *     }
   *   }
   * }
   * ```
   * the parent type of the `animal.meows` path will be `Cat` (and not `Animal`),
   * while the type of the `animal.name` path will remain `Animal`.
   */
  parentType: string;
  /** The type this field resolves. */
  type: string;
  /**
   * Concrete/unwrapped type of the {@link type field type}.
   *
   * For example, it's `Product` if the {@link type field type} is:
   *   - `Product`
   *   - `Product!`
   *   - `[Product]!`
   *   - `[Product!]`
   *   - `[Product!]!`
   *
   * *_Same example applies for scalar {@link type field type}._
   */
  ofType: string;
  /** The inline variables on the field. */
  inlineVariables: Record<string, unknown>;
}

export interface GatherPlanResolverCompositeField
  extends GatherPlanResolverAnyField {
  kind: 'composite';
  selections: GatherPlanResolverField[];
}

export interface GatherPlanResolverScalarField
  extends GatherPlanResolverAnyField {
  kind: 'scalar';
}

type GatherPlanResolverField =
  | GatherPlanResolverCompositeField
  | GatherPlanResolverScalarField;

export function planGather(
  schemaPlan: SchemaPlan,
  doc: DocumentNode,
): GatherPlan {
  const gatherPlan: GatherPlan = {
    query: print(doc),
    operations: [],
  };

  const fields: GatherPlanResolverField[] = [];
  const entries: string[] = [];
  const typeInfo = new TypeInfo(buildSchema(schemaPlan.schema));
  let currOperation: GatherPlanOperation;
  visit(
    // we want to flatten fragments in the document
    // to just use the field visitor to build the gather
    flattenFragments(doc),
    visitWithTypeInfo(typeInfo, {
      OperationDefinition(node) {
        currOperation = {
          name: node.name?.value || null,
          type: node.operation,
          resolvers: {},
        };
        gatherPlan.operations.push(currOperation);
      },
      Field: {
        enter(node) {
          entries.push(node.name.value);

          const fieldDef = typeInfo.getFieldDef();
          if (!fieldDef) {
            throw new Error(`No field definition found for ${node.name.value}`);
          }

          const parentType = typeInfo.getParentType();
          if (!parentType) {
            throw new Error(`No parent type found for node ${node.name.value}`);
          }

          const type = typeInfo.getType();
          const ofType = getNamedType(type);
          if (!ofType) {
            throw new Error(`No named type found for node ${node.name.value}`);
          }

          const inlineVariables: Record<string, unknown> = {};
          for (const arg of node.arguments || []) {
            if (arg.value.kind === Kind.VARIABLE) {
              // skip over fields needing operation variables
              continue;
            }
            const argDef = fieldDef.args.find(
              (a) => a.name === arg.name.value,
            )!; // TODO: check instead of assert
            inlineVariables[arg.name.value] = valueFromAST(
              arg.value,
              argDef.type,
            );
          }

          if (isCompositeType(ofType)) {
            insertFieldAtDepth(fields, entries.length - 1, {
              kind: 'composite',
              path: entries.join('.'),
              name: node.name.value,
              parentType: parentType.name,
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
              selections: [],
            });
          } else {
            insertFieldAtDepth(fields, entries.length - 1, {
              kind: 'scalar',
              path: entries.join('.'),
              parentType: parentType.name,
              name: node.name.value,
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
            });
          }
        },
        leave() {
          entries.pop();
        },
      },
    }),
  );

  for (const operation of gatherPlan.operations) {
    operation.resolvers = planGatherResolversForOperationFields(
      schemaPlan,
      operation,
      fields,
    );
  }

  return gatherPlan;
}

function insertFieldAtDepth(
  selections: GatherPlanResolverField[],
  depth: number,
  field: GatherPlanResolverField,
) {
  let curr = { selections };
  for (let i = 0; i < depth; i++) {
    // increase depth by going into the last field of the current field
    const field = curr.selections[curr.selections.length - 1]!;
    if (field.kind === 'scalar') {
      throw new Error(
        `Cannot add a field at depth ${depth} because its parent is scalar`,
      );
    }
    curr = field;
  }
  curr.selections.push(field);
}

function planGatherResolversForOperationFields(
  schemaPlan: SchemaPlan,
  operation: GatherPlanOperation,
  fields: GatherPlanResolverField[],
): Record<string, GatherPlanResolver> {
  const operationPlan = schemaPlan.operations[operation.type];
  if (!operationPlan) {
    throw new Error(
      `Schema plan does not have the "${operation.type}" operation`,
    );
  }

  const resolvers: Record<string, GatherPlanResolver> = {};

  for (const operationField of fields) {
    const operationFieldPlan = operationPlan.fields[operationField.name];
    if (!operationFieldPlan) {
      throw new Error(
        `Schema operation plan "${operationPlan.name}" doesn't have a "${operationField.name}" field`,
      );
    }
    if (!Object.keys(operationFieldPlan.resolvers).length) {
      throw new Error(
        `Schema operation plan "${operationPlan.name}" field "${operationField.name}" doesn't have resolvers`,
      );
    }

    // TODO: choose the right resolver when multiple
    const operationFieldResolver = Object.values(
      operationFieldPlan.resolvers,
    )[0]!;

    const resolver: GatherPlanResolver =
      operationFieldResolver.kind === 'scalar'
        ? {
            ...operationFieldResolver,
            field: operationField,
            pathToExportData: [],
          }
        : {
            ...operationFieldResolver,
            field: operationField,
            pathToExportData: [],
            exports: [],
            includes: {},
          };

    if (operationField.kind === 'composite') {
      if (resolver.kind !== 'interface' && resolver.kind !== 'object') {
        throw new Error(
          'Composite operation field must have and interface or object resolver',
        );
      }
      insertResolversForGatherPlanCompositeField(
        schemaPlan,
        operationField,
        resolver,
        '',
      );
    }

    resolvers[operationField.name] = resolver;
  }

  // we build resolvers operations only after gather.
  // this way we ensure that all fields are available
  // in both the private and public lists
  buildAndInsertOperationsInResolvers(schemaPlan, Object.values(resolvers));

  return resolvers;
}

function insertResolversForGatherPlanCompositeField(
  schemaPlan: SchemaPlan,
  parent: GatherPlanResolverCompositeField,
  parentResolver: GatherPlanCompositeResolver,
  pathPrefix: string,
) {
  for (const field of parent.selections) {
    let fieldPlan: SchemaPlanField;
    const interfacePlan = schemaPlan.interfaces[parent.ofType];
    if (interfacePlan) {
      // field is in an interface type
      const interfaceFieldPlan = interfacePlan.fields[field.name];
      if (interfaceFieldPlan) {
        fieldPlan = interfaceFieldPlan;
      } else {
        // field is in an object that implements the interface
        const objectPlan = Object.values(schemaPlan.objects).find(
          (o) =>
            o.implements.includes(interfacePlan.name) && // object must implement the interface
            o.name === field.parentType,
        );
        if (!objectPlan) {
          throw new Error(
            `Schema plan doesn't have a "${parent.ofType}" object implementing the "${interfacePlan.name}" interface`,
          );
        }
        const objectFieldPlan = objectPlan.fields[field.name];
        if (!objectFieldPlan) {
          throw new Error(
            `Schema plan "${objectPlan.name}" object doesn't have a "${field.name}" field`,
          );
        }
        fieldPlan = objectFieldPlan;
      }
    } else {
      // field is in an object type
      const objectPlan = schemaPlan.objects[parent.ofType];
      if (!objectPlan) {
        throw new Error(
          `Schema plan doesn't have the "${parent.ofType}" object`,
        );
      }
      const objectFieldPlan = objectPlan.fields[field.name];
      if (!objectFieldPlan) {
        throw new Error(
          `Schema plan "${objectPlan.name}" object doesn't have a "${field.name}" field`,
        );
      }
      fieldPlan = objectFieldPlan;
    }

    let resolver = fieldPlan.subgraphs.includes(parentResolver.subgraph)
      ? parentResolver
      : Object.values(parentResolver.includes).find((r) =>
          fieldPlan.subgraphs.includes(r.subgraph),
        );
    if (!resolver) {
      // this field cannot be resolved from the parent's subgraph
      // add an dependant resolver to the parent for the field(s)

      // TODO: handle interfaces

      const objectPlan = schemaPlan.objects[parent.ofType];
      if (!objectPlan) {
        throw new Error(
          `Schema plan doesn't have the "${parent.ofType}" object`,
        );
      }

      const resolverPlan = Object.values(objectPlan.resolvers).find((r) =>
        fieldPlan.subgraphs.includes(r.subgraph),
      );
      if (!resolverPlan) {
        throw new Error(
          `Schema plan object "${objectPlan.name}" doesn't have a resolver for any of the "${fieldPlan.name}" field subgraphs`,
        );
      }
      if (!Object.keys(resolverPlan.variables).length) {
        // TODO: object resolver must always have variables, right?
        throw new Error(
          `Schema plan object "${objectPlan.name}" field "${fieldPlan.name}" resolver doesn't require variables`,
        );
      }

      for (const variable of Object.values(resolverPlan.variables)) {
        if (!('select' in variable)) {
          continue;
        }
        // make sure parent resolver exports fields that are needed
        // as variables to perform the resolution
        //
        // if the parent doesnt export the necessary variable, add it
        // to parents export for resolution during execution
        //
        // *parent resolver is the one that {@link GatherPlanCompositeResolver.includes} this resolver
        const path = `${pathPrefix}${parent.name}.${variable.select}`;
        const parentExport = parentResolver.public.find((e) => e === path);
        if (!parentExport) {
          // TODO: disallow pushing same path multiple times
          // TODO: what happens if the parent cannot resolve this field?

          // TODO: if the parent cant resolve, insert here the necessary field resolver
          //       add this resolver to its includes
          parentResolver.private.push(path);
        }
      }

      resolver = {
        ...resolverPlan,
        field,
        pathToExportData: [],
        exports: [],
        includes: {},
      };

      parentResolver.includes[`${pathPrefix}${parent.name}`] = resolver;
    }

    const resolvingParentType = resolver.ofType === parent.ofType;

    const path = `${pathPrefix}${
      resolvingParentType
        ? ''
        : // include the parent field only if we're NOT directly resolving
          // the parent; meaning, this field is a nested field of the parent
          `${parent.name}.`
    }${field.name}`;

    if (field.kind === 'composite') {
      // dont include the root of the composite type as an export path
      //   1. operation `{ products { name } }` should have the following exports:
      //      ['products.name'] and not ['products', 'products.name']
      //   2. operation `{ products { manifacturer { name } } }` should have the following exports:
      //      ['products.manifacturer.name'] and not ['products', 'products.manifacturer', 'products.manifacturer.name']
    } else {
      resolver.public.push(path);
    }

    if (field.kind === 'composite') {
      insertResolversForGatherPlanCompositeField(
        schemaPlan,
        field,
        resolver,
        resolvingParentType
          ? pathPrefix
          : // same reasoning as above, this field is a nested field of the parent
            path + '.',
      );
    }
  }
}

export function buildAndInsertOperationsInResolvers(
  schemaPlan: SchemaPlan,
  resolvers: GatherPlanResolver[],
) {
  for (const resolver of resolvers) {
    const { operation, pathToExportData } = buildResolverOperation(
      resolver.operation,
      resolver.kind === 'scalar' ? [] : resolver.exports,
    );
    resolver.operation = operation;
    resolver.pathToExportData = pathToExportData;
    if ('includes' in resolver) {
      buildAndInsertOperationsInResolvers(
        schemaPlan,
        Object.values(resolver.includes),
      );
    }
  }
}

export function buildResolverOperation(
  operation: string,
  exports: GatherPlanCompositeResolverExport[],
): { operation: string; pathToExportData: string[] } {
  const doc = parse(operation);
  const def = doc.definitions.find((d) => d.kind === Kind.OPERATION_DEFINITION);
  if (!def) {
    throw new Error(`No operation definition found in\n${operation}`);
  }

  if (!exports.length) {
    // no exports means we're resolving a scalar at the deepest field
    const pathToExportData = findDeepestFieldPath(def, []);
    if (!pathToExportData.length) {
      throw new Error(`Path to the deepest field not found in\n${operation}`);
    }
    return {
      operation: print(doc), // pretty print operation
      pathToExportData,
    };
  }

  const path = findExportFragment(def, []);
  if (!path) {
    throw new Error(`__export fragment not found in\n${operation}`);
  }
  const [selectionSet, pathToExportData] = path;

  // we intentionally mutate the original doc, this is safe to do because we never share it
  selectionSet.selections = createSelectionsForExports(exports);

  return {
    operation: print(doc), // pretty print operation
    pathToExportData,
  };
}

function findExportFragment(
  node: ASTNode,
  path: string[],
): [parentSelectionSet: SelectionSetNode, path: string[]] | null {
  if ('selectionSet' in node && node.selectionSet) {
    for (const child of node.selectionSet.selections) {
      if (
        child.kind === Kind.FRAGMENT_SPREAD &&
        child.name.value === '__export'
      ) {
        return [node.selectionSet, path];
      }
      const foundPath = findExportFragment(
        child,
        child.kind === Kind.FIELD ? [...path, child.name.value] : path,
      );
      if (foundPath) {
        return foundPath;
      }
    }
  }
  return null;
}

function findDeepestFieldPath(node: ASTNode, path: string[]): string[] {
  if ('selectionSet' in node && node.selectionSet) {
    for (const child of node.selectionSet.selections) {
      return findDeepestFieldPath(
        child,
        child.kind === Kind.FIELD ? [...path, child.name.value] : path,
      );
    }
  }
  return path;
}

/**
 * Creates a GraphQL selection set for dot-notation nested list of fields in fragments.
 * It will expand the fields' dots to nested paths.
 *
 * For example, if {@link exports} is:
 * ```json
 * {
 *   "type": "Product",
 *   "path": "",
 *   "selections": [
 *     "name",
 *     {
 *       "type": "Manufacturer",
 *       "path": "manufacturer",
 *       "selections": [
 *         "name",
 *         {
 *           "type": "Product",
 *           "path": "products",
 *           "selections": ["upc"],
 *          },
 *        ],
 *     },
 *     "manufacturer.id",
 *     "price",
 *   ],
 * }
 * ```
 * the printed result will be:
 * ```graphql
 * ... on Product {
 *   name
 *   manufacturer {
 *     ... on Manufacturer {
 *       name
 *       products {
 *         ... on Product {
 *           upc
 *         }
 *       }
 *     }
 *     id
 *   }
 *   price
 * }
 * ```
 */
export function createSelectionsForExports(
  exports: GatherPlanCompositeResolverExport[],
): readonly SelectionNode[] {
  const sels: SelectionNode[] = [];
  for (const exp of exports) {
    if ('type' in exp) {
      // inline fragment
      sels.push({
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: exp.type,
          },
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: createSelectionsForExports(exp.selections),
        },
      });
    } else {
      // field
      sels.push({
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: exp.name,
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: exp.selections
            ? createSelectionsForExports(exp.selections)
            : [],
        },
      });
    }
  }
  return sels;
}
