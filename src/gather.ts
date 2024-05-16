import {
  ASTNode,
  buildSchema,
  DocumentNode,
  getNamedType,
  isCompositeType,
  Kind,
  OperationTypeNode,
  parse,
  parseType,
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
  SchemaPlanInterfaceResolver,
  SchemaPlanObjectResolver,
  SchemaPlanResolver,
  SchemaPlanResolverConstantVariable,
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
  pathToExportData: (string | number)[];
  /**
   * The exports of the resolver that are to be available for the
   * {@link includes}; and, when public (not {@link OperationExport.private private}),
   * also in the final result for the user.
   */
  exports: OperationExport[];
  /**
   * Other resolvers that are necessary to fulfill the data. They depend
   * on fields from this resolver. These resolvers of fields that don't
   * exist in this resolver.
   *
   * A map of field paths to the necessary resolver. If the field path is an empty string,
   * the include is resolving additional fields for the current resolver.
   */
  includes: Record<string, GatherPlanCompositeResolver>;
}

export interface GatherPlanScalarResolver extends SchemaPlanScalarResolver {
  /**
   * The path to the scalar in the execution result.
   */
  pathToExportData: (string | number)[];
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

  const operationFields: OperationOperationField[] = [];
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
          getSelectionsAtDepth(operationFields, depth - 1).push({
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
            getSelectionsAtDepth(operationFields, depth - 1).push({
              kind: 'object',
              path: entries.join('.'),
              name: node.name.value,
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
              selections: [],
            });
          } else {
            getSelectionsAtDepth(operationFields, depth - 1).push({
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

/** TODO: can an operation field be a fragment? */
type OperationOperationField = OperationScalarField | OperationObjectField;

type OperationField = OperationObjectField | OperationScalarField;

type OperationCompositeSelection = OperationObjectField | OperationFragment;

function getSelectionsAtDepth(
  selections: OperationSelection[],
  depth: number,
): OperationSelection[];
function getSelectionsAtDepth(
  selections: OperationExport[],
  depth: number,
): OperationExport[];
function getSelectionsAtDepth(
  selections: (OperationSelection | OperationExport)[],
  depth: number,
): (OperationSelection | OperationExport)[] {
  let curr = { selections };

  while (depth) {
    // increase depth by going into the last field with selections of the current field
    const field = curr.selections.findLast((s) => 'selections' in s);
    if (!field) {
      throw new Error(
        `Cannot go deeper in "${JSON.stringify(curr.selections)}"`,
      );
    }
    if (!('selections' in field)) {
      throw new Error(
        `Cannot get selections at depth ${depth} because parent is scalar`,
      );
    }
    curr = field;
    depth--;
  }

  return curr.selections;
}

/**
 * Finds inline variables of the field that match by name resolver's required
 * variables and creates {@link SchemaPlanResolverConstantVariable}s them.
 */
function inlineToResolverConstantVariables(
  resolver: SchemaPlanResolver,
  field: OperationField,
) {
  const variables: SchemaPlanResolver['variables'] = {};
  for (const [name, variable] of Object.entries(resolver.variables)) {
    const inlineVariable = field.inlineVariables[name];
    if (inlineVariable) {
      variables[name] = {
        kind: 'constant',
        name,
        value: inlineVariable,
      };
    } else {
      variables[name] = variable;
    }
  }
  return variables;
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
            variables: inlineToResolverConstantVariables(
              operationFieldResolver,
              operationField,
            ),
            pathToExportData: [],
          }
        : {
            ...operationFieldResolver,
            variables: inlineToResolverConstantVariables(
              operationFieldResolver,
              operationField,
            ),
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
        0,
      );
    }

    resolvers[operationField.name] = resolver;
  }

  // we build resolvers operations only after gather.
  // this way we ensure that all fields are available
  // in both the private and public lists
  buildAndInsertOperationsInResolvers(Object.values(resolvers));

  return resolvers;
}

function insertResolversForGatherPlanCompositeField(
  schemaPlan: SchemaPlan,
  parent: OperationCompositeSelection,
  parentResolver: GatherPlanCompositeResolver,
  /**
   * When resolving nested selections, we want to append further
   * selections under a specific depth in parent's exports.
   *
   * See {@link getSelectionsAtDepth} to understand how
   * selections at a given depth are found.
   */
  depth: number,
) {
  for (const sel of parent.selections) {
    if (sel.kind === 'fragment') {
      // validation
      if (parent.kind !== 'object') {
        throw new Error('Only object fields can have fragments');
      }
      if (sel.typeCondition !== parent.ofType) {
        // fragment is of an object type that parent's interface should implement
        const interfacePlan = schemaPlan.types[parent.ofType];
        if (!interfacePlan || interfacePlan.kind !== 'interface') {
          throw new Error(
            "Cannot have a fragment of different type spread in a field that's not an interface",
          );
        }
        const objectPlan = schemaPlan.types[sel.typeCondition];
        if (!objectPlan || objectPlan.kind !== 'object') {
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
        if (!schemaPlan.types[parent.ofType]) {
          throw new Error(
            "Fragment's type spread in a field of a doesnt have type in schem plan",
          );
        }
      }

      let frag: OperationFragmentExport | null = null;
      if (sel.typeCondition !== parent.ofType) {
        // insert export for the fragment into the available resolver
        // only if its type condition is different from the parent
        frag = {
          kind: 'fragment',
          typeCondition: sel.typeCondition,
          selections: [],
        };
        getSelectionsAtDepth(parentResolver.exports, depth).push(frag);
      }
      insertResolversForGatherPlanCompositeField(
        schemaPlan,
        sel,
        parentResolver,
        frag ? depth + 1 : depth,
      );
      if (frag && !frag.selections.length) {
        // when dealing with interfaces, a including resolver may have
        // ejected a field from the fragment in cases where the parent
        // resolver doesnt have the resolver type implementing the interface.
        // in that case, we're left with an empty fragment that we can just remove
        // TODO: maybe do this at that location where the eject is done
        const sels = getSelectionsAtDepth(parentResolver.exports, depth);
        sels.splice(sels.indexOf(frag), 1);
      }
      continue;
    }

    const parentOfType =
      parent.kind === 'fragment' ? parent.typeCondition : parent.ofType;
    const typePlan = schemaPlan.types[parentOfType];
    if (!typePlan) {
      throw new Error(`Schema plan doesn't have a "${parentOfType}" type`);
    }

    const fieldPlan = typePlan.fields[sel.name];
    if (!fieldPlan) {
      throw new Error(
        `Schema plan for type "${typePlan.name}" doesn't have a "${sel.name}" field`,
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
        | undefined = Object.values(typePlan.resolvers).find((r) =>
        fieldPlan.subgraphs.includes(r.subgraph),
      );
      if (!resolverPlan) {
        throw new Error(
          `Schema plan object "${typePlan.name}" doesn't have a resolver for any of the "${fieldPlan.name}" field subgraphs`,
        );
      }
      if (!Object.keys(resolverPlan.variables).length) {
        // TODO: object resolver must always have variables, right?
        throw new Error(
          `Schema plan object "${typePlan.name}" field "${fieldPlan.name}" resolver doesn't require variables`,
        );
      }

      for (const variable of Object.values(resolverPlan.variables).filter(
        isSchemaPlanResolverSelectVariable,
      )) {
        // TODO: disallow pushing same path multiple times
        // TODO: what happens if the parent cannot resolve this variable selection?
        //       if the parent cant resolve, insert here the necessary field resolver
        //       add this resolver to its includes
        const parentTypePlan = schemaPlan.types[parentResolver.ofType]!; // must exist at this point
        const parentTypeCanResolveSelection = !!Object.values(
          !depth
            ? parentTypePlan.fields
            : // nested field in parent's selection, we already know that
              // the root field can be resolved, so we only need to check whether
              // this selection is available at parent's resolver subgraph
              typePlan.fields,
        ).find(
          (f) =>
            f.name === variable.select &&
            f.subgraphs.includes(parentResolver.subgraph),
        );

        let selections = getSelectionsAtDepth(parentResolver.exports, depth);
        if (!parentTypeCanResolveSelection) {
          if (
            parentTypePlan.kind === 'interface' &&
            typePlan.kind === 'object' &&
            typePlan.implements.includes(parentTypePlan.name)
          ) {
            // selected field is available on the interface at the root
            // we need to go one up since we're dealing with a fragment spread
            depth--;
            selections = getSelectionsAtDepth(parentResolver.exports, depth);
          } else {
            throw new Error('TODO: explanatory error message');
          }
        }

        // make sure parent resolver exports fields that are needed
        // as variables to perform the resolution.
        // if the parent doesnt export the necessary variable, add it
        // to parents export for resolution during execution
        if (
          !selections.find((e) => {
            // TODO: support selects of nested paths, like `manufacturer.id`
            // @ts-expect-error support selecting a variable thats on the root but under a fragment
            return e.name === variable.select;
          })
        ) {
          selections.push({
            private: true,
            kind: 'scalar', // TODO: do variables always select scalars?
            name: variable.select,
          });
        }
      }

      let exportDataType = parseType(resolverPlan.type);
      if (exportDataType.kind === Kind.NON_NULL_TYPE) {
        exportDataType = exportDataType.type;
      }

      resolver = {
        ...resolverPlan,
        variables: inlineToResolverConstantVariables(resolverPlan, sel),
        pathToExportData:
          // we're resolving a single type. if the resolver returns a list, use the first result
          // TODO: handle nested lists (should not happen though)
          exportDataType.kind === Kind.LIST_TYPE ? [0] : [],
        exports: [],
        includes: {},
      };

      // TODO: what if parentResolver.includes already has this key? solution: an include may have multiple resolvers

      parentResolver.includes[
        !depth
          ? // we're resolving additional fields for parent's resolver
            ''
          : // we're resolving a field in parent's resolver
            parent.kind === 'fragment'
            ? parent.fieldName
            : parent.name
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

    if (resolver === parentResolver) {
      getSelectionsAtDepth(parentResolver.exports, depth).push(exp);
    } else {
      resolver.exports.push(exp);
    }

    if (sel.kind === 'object') {
      insertResolversForGatherPlanCompositeField(
        schemaPlan,
        sel,
        resolver,
        resolver === parentResolver ? depth + 1 : depth,
      );
    }
  }
}

function buildAndInsertOperationsInResolvers(resolvers: GatherPlanResolver[]) {
  for (const resolver of resolvers) {
    const { operation, pathToExportData } = buildResolverOperation(
      resolver.operation,
      resolver.kind === 'scalar' ? [] : resolver.exports,
    );
    resolver.operation = operation;
    resolver.pathToExportData = [
      ...pathToExportData,
      // we append the original path because it may contain additional paths
      // (see creating resolvers in insertResolversForGatherPlanCompositeField)
      ...resolver.pathToExportData,
    ];
    if ('includes' in resolver) {
      buildAndInsertOperationsInResolvers(Object.values(resolver.includes));
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
