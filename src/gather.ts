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
  isSchemaPlanResolverSelectVariable,
  SchemaPlan,
  SchemaPlanCompositeResolver,
  SchemaPlanInterface,
  SchemaPlanInterfaceResolver,
  SchemaPlanObject,
  SchemaPlanObjectResolver,
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
  /** The path to the `__export` fragment in the execution result. */
  pathToExportData: string[];
  /** Inline variables of the operation field in user's query. */
  inlineVariables: Record<string, unknown>;
  /**
   * The exports of the resolver that are to be available for the
   * {@link includes}; and, when public (not {@link OperationExport.private private}),
   * also in the final result for the user.
   */
  exports: OperationExport[];
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

export interface GatherPlanScalarResolver extends SchemaPlanScalarResolver {
  /** Inline variables of the operation field in user's query. */
  inlineVariables: Record<string, unknown>;
  /**
   * The path to the scalar in the execution result.
   */
  pathToExportData: string[];
}

export type OperationExport =
  | OperationScalarExport
  | OperationObjectExport
  | OperationFragmentExport;

export interface OperationExportAvailability {
  /**
   * Whether the export is public or private.
   *
   * Public (not private) exports are are also available in the final result for the user,
   * while private exports are not available to the user. Private exports are often used
   * when parent has to resolve additional fields for its includes.
   *
   * This flag only changes the behaviour of resolver execution, it does not alter the operation.
   */
  private?: true;
}

export interface OperationScalarExport extends OperationExportAvailability {
  kind: 'scalar';
  /** Name of the scalar field. */
  name: string;
}

export interface OperationObjectExport extends OperationExportAvailability {
  kind: 'object';
  /** Name of the composite field. */
  name: string;
  /** Nested selections of the field. */
  selections: OperationExport[];
}

export interface OperationFragmentExport extends OperationExportAvailability {
  kind: 'fragment';
  /** The type condition of the fragment. */
  typeCondition: string;
  /** Selections of the fragment. */
  selections: OperationExport[];
}

export function planGather(
  schemaPlan: SchemaPlan,
  doc: DocumentNode,
): GatherPlan {
  const gatherPlan: GatherPlan = {
    query: print(doc),
    operations: [],
  };

  // TODO: can an operation field be a fragment?
  const operationFields: (OperationScalarField | OperationObjectField)[] = [];
  const entries: string[] = [];
  let depth = 0;
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
      InlineFragment: {
        enter(node) {
          depth++;
          if (!node.typeCondition) {
            throw new Error('Inline fragment must have a type condition');
          }
          insertOperationFieldAtDepth(operationFields, depth - 1, {
            kind: 'fragment',
            fieldName: entries[entries.length - 1]!,
            path: entries.join('.'),
            typeCondition: node.typeCondition.name.value,
            selections: [],
          });
        },
        leave() {
          depth--;
        },
      },
      Field: {
        enter(node) {
          depth++;
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
            insertOperationFieldAtDepth(operationFields, depth - 1, {
              kind: 'object',
              path: entries.join('.'),
              name: node.name.value,
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
              selections: [],
            });
          } else {
            insertOperationFieldAtDepth(operationFields, depth - 1, {
              kind: 'scalar',
              path: entries.join('.'),
              name: node.name.value,
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
            });
          }
        },
        leave() {
          depth--;
          entries.pop();
        },
      },
    }),
  );

  for (const operation of gatherPlan.operations) {
    operation.resolvers = planGatherResolversForOperationFields(
      schemaPlan,
      operation,
      operationFields,
    );
  }

  return gatherPlan;
}

interface OperationScalarField extends OperationScalarExport {
  /** Dot-notation path to the field in the operation. */
  path: string;
  /** The type this field resolves. */
  type: string;
  /**
   * Concrete/unwrapped type of the {@link type field type}.
   *
   * For example, it's `String` if the {@link type field type} is:
   *   - `String`
   *   - `String!`
   *   - `[String]!`
   *   - `[String!]`
   *   - `[String!]!`
   */
  ofType: string;
  /** The inline variables on the field. */
  inlineVariables: Record<string, unknown>;
}

interface OperationObjectField extends OperationObjectExport {
  /** Dot-notation path to the field in the operation. */
  path: string;
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
   */
  ofType: string;
  /** We override the {@link OperationObjectField.selections} because we need other {@link OperationSelection}s. */
  selections: OperationSelection[];
  /** The inline variables on the field. */
  inlineVariables: Record<string, unknown>;
}

interface OperationFragment extends OperationFragmentExport {
  /** The parent's field name where this fragment is spread. */
  fieldName: string;
  /** Dot-notation path to the fragment in the operation. */
  path: string;
  /** We override the {@link OperationFragment.selections} because we need other {@link OperationSelection}s. */
  selections: OperationSelection[];
}

type OperationSelection =
  | OperationScalarField
  | OperationObjectField
  | OperationFragment;

type OperationField = OperationObjectField | OperationScalarField;

type OperationCompositeSelection = OperationObjectField | OperationFragment;

function insertOperationFieldAtDepth(
  selections: OperationSelection[],
  depth: number,
  field: OperationSelection,
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
  operationFields: OperationField[],
): Record<string, GatherPlanResolver> {
  const operationPlan = schemaPlan.operations[operation.type];
  if (!operationPlan) {
    throw new Error(
      `Schema plan does not have the "${operation.type}" operation`,
    );
  }

  const resolvers: Record<string, GatherPlanResolver> = {};

  for (const operationField of operationFields) {
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
            inlineVariables:
              'inlineVariables' in operationField
                ? operationField.inlineVariables
                : {},
            pathToExportData: [],
          }
        : {
            ...operationFieldResolver,
            inlineVariables:
              'inlineVariables' in operationField
                ? operationField.inlineVariables
                : {},
            pathToExportData: [],
            exports: [],
            includes: {},
          };

    if (operationField.kind !== 'scalar') {
      if (resolver.kind === 'scalar') {
        throw new Error(
          'Composite operation field must not have a scalar resolver',
        );
      }
      insertResolversForGatherPlanCompositeField(
        schemaPlan,
        operationField,
        resolver,
        null,
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
  parent: OperationCompositeSelection,
  parentResolver: GatherPlanCompositeResolver,
  parentExport: OperationFragmentExport | OperationObjectExport | null, // TODO: support fragment kind
) {
  for (const sel of parent.selections) {
    if (sel.kind === 'fragment') {
      // validation
      if (parent.kind !== 'object') {
        throw new Error('Only object fields can have fragments');
      }
      if (sel.typeCondition !== parent.ofType) {
        // fragment is of an object type that parent's interface should implement
        const interfacePlan = schemaPlan.interfaces[parent.ofType];
        if (!interfacePlan) {
          throw new Error(
            "Cannot have a fragment of different type spread in a field that's not an interface",
          );
        }
        const objectPlan = schemaPlan.objects[sel.typeCondition];
        if (!objectPlan) {
          throw new Error(
            `Schema plan doesn't have a "${sel.typeCondition}" object`,
          );
        }
        if (!objectPlan.implements.includes(interfacePlan.name)) {
          throw new Error(
            `Schema plan "${sel.typeCondition}" object doesn't implement the "${interfacePlan.name}" interface`,
          );
        }
      } else {
        // fragment is of the same interface/object type as the parent
        if (
          !schemaPlan.interfaces[parent.ofType] &&
          !schemaPlan.objects[parent.ofType]
        ) {
          throw new Error(
            "Fragment's type spread in a field of a different type",
          );
        }
      }

      let exp = parentExport;
      if (sel.typeCondition !== parent.ofType) {
        // insert export for the fragment into the available resolver
        // only if its type condition is different from the parent
        exp = {
          kind: 'fragment',
          typeCondition: sel.typeCondition,
          selections: [],
        };
        if (parentExport) {
          parentExport.selections.push(exp);
        } else {
          parentResolver.exports.push(exp);
        }
      }
      insertResolversForGatherPlanCompositeField(
        schemaPlan,
        sel,
        parentResolver,
        exp,
      );
      continue;
    }

    const parentOfType =
      parent.kind === 'fragment' ? parent.typeCondition : parent.ofType;
    let compositePlan: SchemaPlanInterface | SchemaPlanObject | undefined =
      schemaPlan.interfaces[parentOfType];
    if (!compositePlan) {
      const objectPlan = schemaPlan.objects[parentOfType];
      if (!objectPlan) {
        throw new Error(
          `Schema plan doesn't have a "${parentOfType}" interface or object`,
        );
      }
      compositePlan = objectPlan;
    }

    const fieldPlan = compositePlan.fields[sel.name];
    if (!fieldPlan) {
      throw new Error(
        `Schema plan "${compositePlan.name}" for interface or object doesn't have a "${sel.name}" field`,
      );
    }

    // use the parent resolver if the field is available in its subgraph;
    // if not, try finding a resolver in parents includes
    let resolver = fieldPlan.subgraphs.includes(parentResolver.subgraph)
      ? parentResolver
      : Object.values(parentResolver.includes).find((r) =>
          fieldPlan.subgraphs.includes(r.subgraph),
        );
    if (!resolver) {
      // this field cannot be resolved using existing resolvers
      // add an dependant resolver to the parent for the field(s)

      // TODO: fix the typings here, avoid casting
      const resolverPlan:
        | SchemaPlanInterfaceResolver
        | SchemaPlanObjectResolver
        | undefined = Object.values(compositePlan.resolvers).find((r) =>
        fieldPlan.subgraphs.includes(r.subgraph),
      );
      if (!resolverPlan) {
        throw new Error(
          `Schema plan object "${compositePlan.name}" doesn't have a resolver for any of the "${fieldPlan.name}" field subgraphs`,
        );
      }
      if (!Object.keys(resolverPlan.variables).length) {
        // TODO: object resolver must always have variables, right?
        throw new Error(
          `Schema plan object "${compositePlan.name}" field "${fieldPlan.name}" resolver doesn't require variables`,
        );
      }

      for (const variable of Object.values(resolverPlan.variables).filter(
        isSchemaPlanResolverSelectVariable,
      )) {
        if (!parentExport) {
          // TODO: in this case, make another resolver?
          throw new Error(
            'Cannot select variables from a parent without export',
          );
        }

        // make sure parent resolver exports fields that are needed
        // as variables to perform the resolution
        //
        // if the parent doesnt export the necessary variable, add it
        // to parents export for resolution during execution
        //
        // *parent resolver is the one that {@link GatherPlanCompositeResolver.includes} this resolver
        if (
          !parentExport.selections.find((e) => {
            // TODO: support selects of nested paths, like `manufacturer.id`
            // @ts-expect-error support selecting a variable thats on the root but under a fragment
            return e.name === variable.select;
          })
        ) {
          // TODO: disallow pushing same path multiple times
          // TODO: what happens if the parent cannot resolve this field?
          // TODO: if the parent cant resolve, insert here the necessary field resolver
          //       add this resolver to its includes
          parentExport.selections.push({
            private: true,
            kind: 'scalar', // TODO: do variables alway select scalars?
            name: variable.select,
          });
        }
      }

      resolver = {
        ...resolverPlan,
        inlineVariables: sel.inlineVariables,
        pathToExportData: [],
        exports: [],
        includes: {},
      };

      parentResolver.includes[
        parent.kind === 'fragment' ? parent.fieldName : parent.name
      ] = resolver;
    }

    const exp: OperationObjectExport | OperationScalarExport =
      sel.kind === 'scalar'
        ? {
            kind: 'scalar',
            name: sel.name,
          }
        : {
            kind: 'object',
            name: sel.name,
            selections: [],
          };

    if (resolver === parentResolver && parentExport) {
      // push to parents exports only if we're not creating a new resolver
      parentExport.selections.push(exp);
    } else {
      resolver.exports.push(exp);
    }

    if (sel.kind === 'object') {
      if (sel.kind !== exp.kind) {
        // should never happen, but let's make TS happy
        throw new Error('Selection kind must match the export kind');
      }
      insertResolversForGatherPlanCompositeField(
        schemaPlan,
        sel,
        resolver,
        exp,
      );
    }
  }
}

function buildAndInsertOperationsInResolvers(
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
  exports: OperationExport[],
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
 * If {@link exports} is:
 * ```json
 * [
 *   {
 *     "type":"Product",
 *     "selections":[
 *       {
 *         "name":"name"
 *       },
 *       {
 *         "name":"manufacturer",
 *         "selections":[
 *           {
 *             "name":"products",
 *             "selections":[
 *               {
 *                 "name":"upc"
 *               },
 *               {
 *                 "name":"name"
 *               }
 *             ]
 *           },
 *           {
 *             "type":"Manufacturer",
 *             "selections":[
 *               {
 *                 "name":"id"
 *               },
 *               {
 *                 "name":"name"
 *               },
 *               {
 *                 "name":"products",
 *                 "selections":[
 *                   {
 *                     "name":"manufacturer",
 *                     "selections":[
 *                       {
 *                         "kind":"private",
 *                         "name":"location"
 *                       }
 *                     ]
 *                   },
 *                   {
 *                     "name":"name"
 *                   }
 *                 ]
 *               }
 *             ]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * ]
 * ```
 * the printed result will be:
 * ```graphql
 * ... on Product {
 *   name
 *   manufacturer {
 *     products {
 *       upc
 *       name
 *     }
 *     ... on Manufacturer {
 *       id
 *       name
 *       products {
 *         manufacturer {
 *           location
 *         }
 *         name
 *       }
 *     }
 *   }
 * }
 * ```
 */
function createSelectionsForExports(
  exports: OperationExport[],
): readonly SelectionNode[] {
  const sels: SelectionNode[] = [];
  for (const exp of exports) {
    if (exp.kind === 'fragment') {
      sels.push({
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: exp.typeCondition,
          },
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: createSelectionsForExports(exp.selections),
        },
      });
    } else if (exp.kind === 'object') {
      sels.push({
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: exp.name,
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: createSelectionsForExports(exp.selections),
        },
      });
    } /* exp.kind === 'scalar' */ else {
      sels.push({
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: exp.name,
        },
      });
    }
  }
  return sels;
}
