import {
  ASTNode,
  buildSchema,
  DocumentNode,
  getNamedType,
  isCompositeType,
  Kind,
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
  allSubgraphsForType,
  Blueprint,
  BlueprintCompositeResolver,
  BlueprintResolver,
  BlueprintResolverConstantVariable,
  BlueprintScalarResolver,
  BlueprintType,
  isBlueprintResolverSelectVariable,
} from './blueprint.js';
import { flattenFragments, isListType as parseIsListType } from './utils.js';

export interface GatherPlan {
  query: string;
  /**
   * Operation from the query to execute. If the query has multiple operations,
   * the one defined in `operationName` is the one to be executed.
   */
  operation: GatherPlanOperation;
}

export interface GatherPlanOperation {
  /** The name of the operation to execute. */
  name: string | null;
  /** Name of the type in {@link Blueprint.types blueprint's types} for this operation. */
  type: 'Query' | 'Mutation';
  /** A map of operation field paths to the necessary operation resolver. */
  resolvers: Record<string, GatherPlanResolver>;
}

export type GatherPlanResolver =
  | GatherPlanCompositeResolver
  | GatherPlanScalarResolver;

export type GatherPlanCompositeResolver = BlueprintCompositeResolver & {
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
};

export interface GatherPlanScalarResolver extends BlueprintScalarResolver {
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
  blueprint: Blueprint,
  doc: DocumentNode,
): GatherPlan {
  let gatherPlan!: GatherPlan;

  const fields: OperationField[] = [];
  const entries: string[] = [];
  let depth = 0;
  const typeInfo = new TypeInfo(buildSchema(blueprint.schema));
  visit(
    // we want to flatten fragments in the document
    // to just use the field visitor to build the gather
    flattenFragments(doc),
    visitWithTypeInfo(typeInfo, {
      OperationDefinition(node) {
        if (gatherPlan) {
          // TODO: if the query has more operations, choose the one from `operationName`
          throw new Error('Gather plan operation has already been defined');
        }
        let type = typeInfo.getType();
        if (!type) {
          throw new Error(`No type found for operation "${node.operation}"`);
        }
        type = getNamedType(type);
        if (type.name !== 'Query' && type.name !== 'Mutation') {
          throw new Error(
            `Type for operation "${node.operation}" must be "Query" or "Mutation", but got "${type.name}"`,
          );
        }
        gatherPlan = {
          query: print(doc),
          operation: {
            name: node.name?.value || null,
            type: type.name,
            resolvers: {},
          },
        };
      },
      InlineFragment: {
        enter(node) {
          depth++;
          if (!node.typeCondition) {
            throw new Error('Inline fragment must have a type condition');
          }
          getSelectionsAtDepth(fields, depth - 1).push({
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
            getSelectionsAtDepth(fields, depth - 1).push({
              kind: 'object',
              path: entries.join('.'),
              name: node.name.value,
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
              selections: [],
            });
          } else {
            getSelectionsAtDepth(fields, depth - 1).push({
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

  const operationPlan = blueprint.types[gatherPlan.operation.type];
  if (!operationPlan) {
    throw new Error(
      `Blueprint does not have the "${gatherPlan.operation.type}" operation`,
    );
  }

  for (const field of fields) {
    insertResolversForSelection(
      blueprint,
      operationPlan,
      null,
      field,
      gatherPlan.operation.resolvers,
      0,
      true,
    );
  }

  // we build resolvers operations only after gather.
  // this way we ensure that all fields are available
  // in both the private and public lists
  buildAndInsertOperationsInResolvers(
    Object.values(gatherPlan.operation.resolvers),
  );

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
 * variables and creates {@link BlueprintResolverConstantVariable}s them.
 */
function inlineToResolverConstantVariables(
  resolver: BlueprintResolver,
  field: OperationField,
) {
  const variables: BlueprintResolver['variables'] = {};
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

function insertResolversForSelection(
  blueprint: Blueprint,
  /** Type in which the {@link sel selection} is located. */
  selInType: BlueprintType,
  /** Parent selection of the {@link sel selection}. */
  parentSel: OperationCompositeSelection | null,
  /** Selection for which we're building resolvers. */
  sel: OperationSelection,
  /**
   * The current resolver.
   * Exports will be added to it unless they cant be resolved,
   * in which case a new nested `includes` resolver will be made.
   */
  resolvers: Record<string, GatherPlanResolver>,
  /**
   * When resolving nested selections, we want to append further
   * selections under a specific depth in parent's exports.
   *
   * See {@link getSelectionsAtDepth} to understand how
   * selections at a given depth are found.
   */
  depth: number,
  /**
   * We're resolving additional fields of the parent.
   *
   * TODO: when inside a fragment, the positions of exports may be off
   */
  resolvingAdditionalFields: boolean,
) {
  let latestResolver =
    resolvers[sel.kind === 'fragment' ? sel.fieldName : sel.name];
  if (!latestResolver) {
    throw '';
  }

  if (sel.kind === 'fragment') {
    if (!parentSel) {
      throw new Error(
        'Cannot insert resolvers for fragment selection without parent',
      );
    }
    if (parentSel.kind !== 'object') {
      throw new Error('Only object fields can have fragments');
    }

    // we may place a child (including) resolver inside a fragment, continue reading to see when
    let insideFragment = false;

    // [NOTE 2] an interface can have a resolver that resolves an object implementing that interface, and not
    // the interface itself. because of this, we want to use the current resolver's ofType when at the root
    const parentOfType = depth ? parentSel.ofType : latestResolver.ofType;

    // fragment's type is different from the parent, the type should implement parent's interface
    if (sel.typeCondition !== parentOfType) {
      const interfaceType = blueprint.types[parentOfType];
      if (!interfaceType || interfaceType.kind !== 'interface') {
        // because of [NOTE 2], we want to focus only on fragments whose type condition matches the parent resolver
        // and skip others.
        // see BookAll test case in tests/fixtures/federation/union-intersection/queries.ts
        // TODO: what if all fragments are skipped?
        return;
      }
      const objectType = blueprint.types[sel.typeCondition];
      if (!objectType || objectType.kind !== 'object') {
        throw new Error(
          `Blueprint doesn't have a "${sel.typeCondition}" object`,
        );
      }
      if (!objectType.implements.includes(interfaceType.name)) {
        throw new Error(
          `Blueprint "${sel.typeCondition}" object doesn't implement the "${interfaceType.name}" interface`,
        );
      }

      const objectTypeAvailableInSubgraphs = allSubgraphsForType(objectType);
      if (
        !Object.keys(objectType.resolvers).length &&
        !selInType.fields[sel.fieldName]!.subgraphs.every((s) =>
          objectTypeAvailableInSubgraphs.includes(s),
        )
      ) {
        // the selection's object doesnt have any other resolvers and its available subgraphs
        // dont intersect with the parent field's subgraphs. this means that the field is
        // available in more subgraphs than the selection's object.
        // we therefore skip the fragment spread altogether

        if (!latestResolver.exports.length) {
          // [NOTE 1]
          // here we mimic apollo's behaviour. we want to execute parent's resolver without needing
          // anything from it. one reason to perform the operation anyway is if the subgraph performs
          // some sort of authentication
          //
          // TODO: if there are selections that will be exported in the next loop iteration,
          //       this private export will stay - but should be removed because the request
          //       is not empty anymore
          latestResolver.exports.push({
            kind: 'scalar',
            name: '__typename',
            private: true,
          });
        }
        return;
      }

      if (
        !objectTypeAvailableInSubgraphs.some(
          (s) => s === latestResolver.subgraph,
        )
      ) {
        // the implementing object is not available in parent resolver's
        // subgraph, we have to resolve it from another subgraph

        // TODO: actually choose the best resolver, not the first one
        const resolverPlan = Object.values(objectType.resolvers)[0]?.[0];
        if (!resolverPlan) {
          throw new Error(
            `Blueprint type "${objectType.name}" doesn't have any resolvers`,
          );
        }

        const resolver = prepareCompositeResolverForSelection(
          resolverPlan,
          sel,
          getSelectionsAtDepth(latestResolver.exports, depth),
        );

        // TODO: what if currentResolver.includes already has this key? solution: an include may have multiple resolvers
        latestResolver.includes[''] = resolver;

        for (const subSel of sel.selections) {
          insertResolversForSelection(
            blueprint,
            objectType,
            sel,
            subSel,
            resolver,
            depth,
            sel.kind === 'fragment',
          );
        }
        return;
      }

      // the implementing object can be resolved in parent resolver's
      // subgraph, we just need to wrap the export in a fragment
      insideFragment = true;
      getSelectionsAtDepth(latestResolver.exports, depth).push({
        kind: 'fragment',
        typeCondition: sel.typeCondition,
        selections: [],
      });
    }

    for (const subSel of sel.selections) {
      insertResolversForSelection(
        blueprint,
        selInType,
        sel,
        subSel,
        latestResolver,
        insideFragment ? depth + 1 : depth,
        insideFragment,
      );
    }
    return;
  }

  let resolver: GatherPlanCompositeResolver | undefined;
  const parentOfType =
    parentSel.kind === 'fragment' ? parentSel.typeCondition : parentSel.ofType;
  const parentTypePlan = blueprint.types[parentOfType];
  if (!parentTypePlan) {
    throw new Error(`Blueprint doesn't have a "${parentOfType}" type`);
  }
  let selType: BlueprintType;
  let selField = parentTypePlan.fields[sel.name];
  if (selField) {
    selType = parentTypePlan;

    // use the parent resolver if the field is available in its subgraph;
    // if not, try finding a resolver in parents includes
    resolver = selField.subgraphs.includes(latestResolver.subgraph)
      ? latestResolver
      : Object.values(latestResolver.includes).find((r) =>
          selField!.subgraphs.includes(r.subgraph),
        );
  } else {
    // the parent type may not implement the specific field, but its interface may.
    // in that case, we have to resolve the field from the interface instead
    const interfaceType = Object.values(blueprint.types).find(
      (t) =>
        t.kind === 'interface' &&
        parentTypePlan!.kind === 'object' &&
        parentTypePlan!.implements.includes(t.name),
    );
    if (!interfaceType) {
      throw new Error(
        `Blueprint for type "${parentTypePlan.name}" doesn't have a "${sel.name}" field`,
      );
    }

    selField = interfaceType.fields[sel.name];
    if (!selField) {
      throw new Error(
        `Blueprint interface "${interfaceType.name}" that type "${parentTypePlan.name}" implements doesn't have a "${sel.name}" field`,
      );
    }

    // we change the selection's type plan to the interface which will
    // have the resolver creation below use the interface instead of the type
    selType = interfaceType;
  }

  if (!resolver) {
    // this field cannot be resolved using existing resolvers
    // add an dependant resolver to the parent for the field(s)

    const commonSubgraph = Object.keys(selType.resolvers).find((subgraph) =>
      selField.subgraphs.includes(subgraph),
    );
    const resolverPlan = commonSubgraph
      ? // TODO: actually choose the best resolver, not the first one
        selType.resolvers[commonSubgraph]![0]
      : undefined;
    if (!resolverPlan) {
      throw new Error(
        `Blueprint type "${selType.name}" doesn't have a resolver for any of the "${selField.name}" field subgraphs`,
      );
    }

    resolver = prepareCompositeResolverForSelection(
      resolverPlan,
      sel,
      getSelectionsAtDepth(latestResolver.exports, depth),
    );

    // TODO: what if currentResolver.includes already has this key? solution: an include may have multiple resolvers
    latestResolver.includes[
      resolvingAdditionalFields
        ? ''
        : parentSel.kind === 'fragment'
          ? parentSel.fieldName
          : parentSel.name
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

  const dest =
    resolver === latestResolver
      ? getSelectionsAtDepth(latestResolver.exports, depth)
      : resolver.exports;
  if (!exportsIncludeField(dest, exp.name, true)) {
    dest.push(exp);
  }

  if (sel.kind === 'object') {
    for (const subSel of sel.selections) {
      insertResolversForSelection(
        blueprint,
        selType,
        sel,
        subSel,
        resolver,
        resolver === latestResolver ? depth + 1 : depth,
        false,
      );
    }
  }
}

function prepareCompositeResolverForSelection(
  /** The composite resolver plan to prepare. */
  resolverPlan: BlueprintCompositeResolver,
  /** The selection in question. */
  sel: OperationSelection,
  /** Available exports of the parent resolver. */
  exps: OperationExport[],
): GatherPlanCompositeResolver {
  if (!Object.keys(resolverPlan.variables).length) {
    // TODO: object resolver must always have variables, right?
    throw new Error(
      `Blueprint resolver for type "${resolverPlan.ofType}" doesn't require variables`,
    );
  }

  for (const variable of Object.values(resolverPlan.variables).filter(
    isBlueprintResolverSelectVariable,
  )) {
    // make sure parent resolver exports fields that are needed
    // as variables to perform the resolution. if the parent doesnt
    // export the necessary variable, add it as private to parents
    // exports for resolution during execution but not available to the user
    if (
      // TODO: support selects of nested paths, like `manufacturer.id`
      !exportsIncludeField(exps, variable.select, false)
    ) {
      // TODO: what if the resolver plan cannot resolve the variable selection?
      exps.push({
        private: true,
        kind: 'scalar', // TODO: do variables always select scalars?
        name: variable.select,
      });
    }
  }

  return {
    ...resolverPlan,
    variables:
      sel.kind === 'fragment'
        ? resolverPlan.variables
        : inlineToResolverConstantVariables(resolverPlan, sel),
    pathToExportData: parseIsListType(resolverPlan.type)
      ? // resolver returns a list, use the first item in the export data
        [0]
      : // otherwise use the export data
        [],
    exports: [],
    includes: {},
  };
}

/**
 * Checks whether the exports include the given field.
 * The check is also performed recursively on fragment spreads.
 */
function exportsIncludeField(
  exps: OperationExport[],
  name: string,
  /** Whether to convert private exports to public ones if the field is found. */
  convertToPublic: boolean,
) {
  for (const exp of exps) {
    if (exp.kind === 'fragment') {
      return exportsIncludeField(exp.selections, name, convertToPublic);
    }
    if (exp.name === name) {
      if (convertToPublic && exp.private) {
        delete exp.private;
      }
      return true;
    }
  }
  return false;
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

  const path = findExportFragment(def, []);
  if (!exports.length && !path) {
    // no exports and no __export fragment means we're resolving a scalar at the deepest field
    const pathToExportData = findDeepestFieldPath(def, []);
    if (!pathToExportData.length) {
      throw new Error(`Path to the deepest field not found in\n${operation}`);
    }
    return {
      operation: print(doc), // pretty print operation
      pathToExportData,
    };
  }
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
