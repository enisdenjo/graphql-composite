import {
  ASTNode,
  buildSchema,
  DocumentNode,
  getNamedType,
  isCompositeType,
  isEnumType,
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
  BlueprintObject,
  BlueprintPrimitiveResolver,
  BlueprintResolver,
  BlueprintResolverConstantVariable,
  BlueprintType,
  isBlueprintResolverSelectVariable,
} from './blueprint.js';
import { flattenFragments, isListType as parseIsListType } from './utils.js';

export const OVERWRITE_FIELD_NAME_PART =
  '__OVERWRITE_EXISTING_FIELD_IF_THIS_ONE_NOT_NULL__';

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
  | GatherPlanPrimitiveResolver;

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
   * A map of field paths to the necessary resolver.
   *
   * If the field path is an empty string (`""`), the include is resolving additional
   * fields for the current resolver. Because of this, the map value is an array of
   * resolvers. Otherwise, the map is a one to one relation of field to resolver.
   */
  includes: {
    ''?: GatherPlanCompositeResolver[];
  } & {
    [field: string]: GatherPlanCompositeResolver;
  };
};

export interface GatherPlanPrimitiveResolver
  extends BlueprintPrimitiveResolver {
  /**
   * The path to the scalar in the execution result.
   */
  pathToExportData: (string | number)[];
}

export type OperationExport =
  | OperationPrimitiveExport
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
  /**
   * The property name to pluck from the operation result.
   * It's the same as {@link name} unless an alias is used
   * in user's query.
   */
  prop: string;
  /**
   * Conflicting fields that have the same name but different nullability
   * need to be augmented so that the conflicting fields are aliased and
   * if they yield a non-nullish value, are used for the origin field.
   *
   * When set, the {@link prop} will contain the {@link OVERWRITE_FIELD_NAME_PART}
   * that is used to deduplicate the field name collision.
   *
   * See https://github.com/enisdenjo/graphql-composite/issues/31 for more info.
   */
  overwrite?: true;
}

export interface OperationEnumExport extends OperationExportAvailability {
  kind: 'enum';
  /** Name of the scalar field. */
  name: string;
  /**
   * The property name to pluck from the operation result.
   * It's the same as {@link name} unless an alias is used
   * in user's query.
   */
  prop: string;
  /**
   * Whitelisted enum value list to be returned by the field. If a field
   * yields a value that is not in the list, it'll be nullified.
   *
   * Values are compared using strict equality.
   */
  values: unknown[];
  /**
   * Conflicting fields that have the same name but different nullability
   * need to be augmented so that the conflicting fields are aliased and
   * if they yield a non-nullish value, are used for the origin field.
   *
   * When set, the {@link prop} will contain the {@link OVERWRITE_FIELD_NAME_PART}
   * that is used to deduplicate the field name collision.
   *
   * See https://github.com/enisdenjo/graphql-composite/issues/31 for more info.
   */
  overwrite?: true;
}

export type OperationPrimitiveExport =
  | OperationScalarExport
  | OperationEnumExport;

export interface OperationObjectExport extends OperationExportAvailability {
  kind: 'object';
  /** Name of the composite field. */
  name: string;
  /**
   * The property name to pluck from the operation result.
   * It's the same as {@link name} unless an alias is used
   * in user's query.
   */
  prop: string;
  /** Nested selections of the field. */
  selections: OperationExport[];
  /**
   * Conflicting fields that have the same name but different nullability
   * need to be augmented so that the conflicting fields are aliased and
   * if they yield a non-nullish value, are used for the origin field.
   *
   * When set, the {@link prop} will contain the {@link OVERWRITE_FIELD_NAME_PART}
   * that is used to deduplicate the field name collision.
   *
   * See https://github.com/enisdenjo/graphql-composite/issues/31 for more info.
   */
  overwrite?: true;
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
          entries.push(node.alias?.value ?? node.name.value);

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

            const argDef = fieldDef.args.find((a) => a.name === arg.name.value);
            if (!argDef) {
              // This should never happen if the DocumentNode was validated against the schema
              // before planning the gather.
              throw new Error(
                `Field "${ofType.name}.${node.name.value}" doesn't have an argument "${arg.name.value}"`,
              );
            }

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
              prop: node.alias?.value ?? node.name.value,
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
              selections: [],
            });
          } else {
            const sel = {
              path: entries.join('.'),
              name: node.name.value,
              prop: node.alias?.value ?? node.name.value,
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
            };
            getSelectionsAtDepth(fields, depth - 1).push(
              isEnumType(ofType)
                ? {
                    kind: 'enum',
                    values: isEnumType(ofType)
                      ? // TODO: check if it's enough to look at public schema, maybe some enum values needs to be removed in some specific query paths
                        ofType.getValues().map(({ value }) => value)
                      : [],
                    ...sel,
                  }
                : {
                    kind: 'scalar',
                    ...sel,
                  },
            );
          }
        },
        leave() {
          depth--;
          entries.pop();
        },
      },
    }),
  );

  const blueprintType = blueprint.types[gatherPlan.operation.type];
  if (!blueprintType) {
    throw new Error(
      `Blueprint does not have the "${gatherPlan.operation.type}" operation`,
    );
  }

  for (const field of fields) {
    const blueprintField = blueprintType.fields[field.name];
    if (!blueprintField) {
      throw new Error(
        `Blueprint operation type "${blueprintType.name}" doesn't have a "${field.name}" field`,
      );
    }
    if (!Object.keys(blueprintField.resolvers).length) {
      throw new Error(
        `Blueprint operation type "${blueprintType.name}" field "${field.name}" doesn't have resolvers`,
      );
    }

    // TODO: choose the right resolver when multiple
    const operationFieldResolver = Object.values(blueprintField.resolvers)[0];
    if (!operationFieldResolver) {
      throw new Error(
        `Blueprint field "${field.name}" on type "${blueprintType.name}" doesn't have resolvers`,
      );
    }

    const resolver: GatherPlanResolver =
      operationFieldResolver.kind === 'primitive'
        ? {
            ...operationFieldResolver,
            variables: inlineToResolverConstantVariables(
              operationFieldResolver,
              field,
            ),
            pathToExportData: [],
          }
        : {
            ...operationFieldResolver,
            variables: inlineToResolverConstantVariables(
              operationFieldResolver,
              field,
            ),
            pathToExportData: [],
            exports: [],
            includes: {},
          };

    if (field.kind !== 'scalar' && field.kind !== 'enum') {
      if (resolver.kind === 'primitive') {
        throw new Error(
          'Composite operation field must not have a primitive resolver',
        );
      }
      for (const sel of field.selections) {
        insertResolversForSelection(
          blueprint,
          blueprintType,
          field,
          sel,
          resolver,
          0,
          true,
        );
      }
      augmentConcflictingFields(blueprint, resolver.subgraph, resolver.exports);
    }

    gatherPlan.operation.resolvers[field.prop] = resolver;
  }

  // we build resolvers operations only after gather.
  // this way we ensure that all fields are available
  // in both the private and public lists
  buildAndInsertOperationsInResolvers(
    Object.values(gatherPlan.operation.resolvers),
  );

  return gatherPlan;
}

function augmentConcflictingFields(
  blueprint: Blueprint,
  subgraph: string,
  exports: OperationExport[],
) {
  // TODO: drop null assertions

  const appearing: {
    [fieldName: string]: /* typeName: */ string;
  } = {};
  let overwriteCount = 0;
  for (const frag of exports.filter(
    // we only worry about fragments because same field names in an object mean same field
    (e): e is OperationFragmentExport => e.kind === 'fragment',
  )) {
    const type = blueprint.types[frag.typeCondition]!;
    for (const sel of frag.selections) {
      if (sel.kind === 'fragment') {
        augmentConcflictingFields(blueprint, subgraph, sel.selections);
        continue;
      }

      if (sel.kind === 'object') {
        augmentConcflictingFields(blueprint, subgraph, sel.selections);
        // no "continue" because the object selection may be of a different type too
      }

      const fieldName = sel.prop;
      const fieldTypeName = type.fields[fieldName]!.types[subgraph]!;

      const appearingTypeName = appearing[fieldName];
      if (!appearingTypeName) {
        appearing[fieldName] = fieldTypeName;
        continue;
      }
      if (appearingTypeName === fieldTypeName) {
        continue;
      }

      // different type from a previously appearing, same named, field
      sel.overwrite = true;
      if (sel.prop.includes(OVERWRITE_FIELD_NAME_PART)) {
        throw new Error(
          `An overwriting field cannot contain "${OVERWRITE_FIELD_NAME_PART}" in the name`,
        );
      }
      sel.prop = `${fieldName}${OVERWRITE_FIELD_NAME_PART}${overwriteCount}`;
      overwriteCount++;
    }
  }
}

type OperationPrimitiveField = OperationPrimitiveExport & {
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
};

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
  | OperationPrimitiveField
  | OperationObjectField
  | OperationFragment;

/** TODO: can an operation field be a fragment? */
type OperationField = OperationObjectField | OperationPrimitiveField;

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
  /** Type in which the {@link parentSel parent selection} is located. */
  parentSelInType: BlueprintType,
  /** Parent selection of the {@link sel selection}. */
  parentSel: OperationCompositeSelection,
  /** Selection for which we're building resolvers. */
  sel: OperationSelection,
  /**
   * The current resolver.
   * Exports will be added to it unless they cant be resolved,
   * in which case a new nested `includes` resolver will be made.
   */
  currentResolver: GatherPlanCompositeResolver,
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
  if (sel.kind === 'fragment') {
    if (parentSel.kind !== 'object') {
      throw new Error('Only object fields can have fragments');
    }

    // we may place a child (including) resolver inside a fragment, continue reading to see when
    let insideFragment = false;

    // [NOTE 2] an interface can have a resolver that resolves an object implementing that interface, and not
    // the interface itself. because of this, we want to use the current resolver's ofType when at the root
    const parentOfType = depth ? parentSel.ofType : currentResolver.ofType;

    // fragment's type is different from the parent, the type should implement parent's interface
    if (sel.typeCondition !== parentOfType) {
      const fragmentType = blueprint.types[sel.typeCondition];
      if (!fragmentType) {
        throw new Error(`Blueprint doesn't have a "${sel.typeCondition}" type`);
      }

      const parentType = blueprint.types[parentOfType];
      if (!parentType) {
        throw new Error(`Blueprint doesn't have a ${parentOfType} type`);
      }

      if (parentType.kind === 'object') {
        if (!implementsInterface(parentType, fragmentType.name)) {
          // parent's object type doesnt implement the type of the fragment
          //
          // because of [NOTE 2], we want to focus only on fragments whose type condition matches
          // the parent resolver and skip others.
          //
          // see BookAll test case in tests/fixtures/federation/union-intersection/queries.ts
          //
          // TODO: what if all fragments are skipped?
          return;
        }

        if (fragmentType.kind === 'object') {
          throw new Error(
            'Cannot have a fragment that is of a different object type than the parent object type',
          );
        }

        // fragment's type is an interface that the parent object type implements. in such cases, the fragment
        // spread is not necessary since the object type contains all fields of the interface type
        for (const subSel of sel.selections) {
          insertResolversForSelection(
            blueprint,
            parentSelInType,
            parentSel,
            subSel,
            currentResolver,
            depth,
            resolvingAdditionalFields,
          );
        }
        return;
      }

      if (fragmentType.kind === 'interface') {
        // parent type is an interface and fragment's type is an interface

        // Convert the fragment to a set of fragments.
        // Do it for each object that implements the interface and is resolvable by the parent type.
        //
        // { ... on Interface { fieldA } }
        // ->
        // { ... on Object1 { fieldA }, ... on Object2 { fieldA } }
        //
        // We can't pass `... on Interface` to a subgraph that is not aware of the interface.
        // The public schema may show the interface on the object types
        // but the subgraph may not have the interface in its schema.
        // It is valid to send such a query in a distributed schema.

        const implementingObjectTypes = Object.values(blueprint.types)
          .filter((t): t is BlueprintObject => t.kind === 'object')
          .filter((t) => implementsInterface(t, fragmentType.name));
        if (!implementingObjectTypes.length) {
          throw new Error(
            `Blueprint interface "${fragmentType.name}" doesn't have any implementing objects`,
          );
        }

        // replace the current fragment with each object type that implements fragment's interface
        for (const implementingType of implementingObjectTypes) {
          getSelectionsAtDepth(currentResolver.exports, depth).push({
            kind: 'fragment',
            typeCondition: implementingType.name,
            selections: [],
          });
          for (const subSel of sel.selections) {
            insertResolversForSelection(
              blueprint,
              implementingType,
              {
                ...sel,
                typeCondition: implementingType.name,
              },
              subSel,
              currentResolver,
              depth + 1,
              true,
            );
          }
        }

        return;
      }

      const fragmentTypeImplementsParentTypeInCurrentSubgraph =
        fragmentType.implements[parentType.name]?.subgraphs.includes(
          currentResolver.subgraph,
        );

      const fragmentTypeSubgraphs = allSubgraphsForType(fragmentType);

      if (
        !fragmentTypeImplementsParentTypeInCurrentSubgraph ||
        (!Object.keys(fragmentType.resolvers).length &&
          !parentSelInType.fields[parentSel.name]!.subgraphs.every((s) =>
            fragmentTypeSubgraphs.includes(s),
          ))
      ) {
        // the selection's object doesnt have any other resolvers and its available subgraphs
        // dont intersect with the parent field's subgraphs. this means that the field is
        // available in more subgraphs than the selection's object.
        // we therefore skip the fragment spread altogether

        if (!getSelectionsAtDepth(currentResolver.exports, depth).length) {
          // [NOTE 1]
          // here we mimic apollo's behaviour. we want to execute parent's resolver without needing
          // anything from it. one reason to perform the operation anyway is if the subgraph performs
          // some sort of authentication
          //
          // TODO: if there are selections that will be exported in the next loop iteration,
          //       this private export will stay - but should be removed because the request
          //       is not empty anymore
          getSelectionsAtDepth(currentResolver.exports, depth).push({
            kind: 'scalar',
            name: '__typename',
            prop: '__typename',
            private: true,
          });
        }
        return;
      }

      if (!fragmentTypeSubgraphs.some((s) => s === currentResolver.subgraph)) {
        // the implementing object is not available in parent resolver's
        // subgraph, we have to resolve it from another subgraph

        // TODO: actually choose the best resolver, not the first one
        const resolverPlan = Object.values(fragmentType.resolvers)[0]?.[0];
        if (!resolverPlan) {
          throw new Error(
            `Blueprint type "${fragmentType.name}" doesn't have any resolvers`,
          );
        }

        const resolver = prepareCompositeResolverForSelection(
          resolverPlan,
          sel,
          getSelectionsAtDepth(currentResolver.exports, depth),
        );

        currentResolver.includes[''] ??= [];
        currentResolver.includes[''].push(resolver);

        for (const subSel of sel.selections) {
          insertResolversForSelection(
            blueprint,
            fragmentType,
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
      getSelectionsAtDepth(currentResolver.exports, depth).push({
        kind: 'fragment',
        typeCondition: sel.typeCondition,
        selections: [],
      });
    }

    for (const subSel of sel.selections) {
      insertResolversForSelection(
        blueprint,
        parentSelInType,
        sel,
        subSel,
        currentResolver,
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
    resolver = selField.subgraphs.includes(currentResolver.subgraph)
      ? currentResolver
      : Object.values(currentResolver.includes)
          .flat()
          .find((r) => selField!.subgraphs.includes(r.subgraph));
  } else {
    // the parent type may not implement the specific field, but its interface may.
    // in that case, we have to resolve the field from the interface instead
    const interfaceType = Object.values(blueprint.types).find(
      (t) =>
        t.kind === 'interface' &&
        parentTypePlan!.kind === 'object' &&
        implementsInterface(parentTypePlan!, t.name),
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
    let resolverPlan = commonSubgraph
      ? // TODO: actually choose the best resolver, not the first one
        selType.resolvers[commonSubgraph]![0]
      : undefined;
    if (
      !resolverPlan &&
      // TODO: dont reuse shared root Mutation type to avoid running them multiple times?
      parentSelInType.name === 'Query'
    ) {
      // theres no resolver for the type but the selection is in a root Query type,
      // try finding a shared root resolver to use
      const fieldInQuery =
        parentSelInType.fields[
          parentSel.kind === 'object' ? parentSel.name : parentSel.fieldName
        ];
      resolverPlan = Object.values(fieldInQuery?.resolvers || {}).find(
        (r): r is BlueprintCompositeResolver =>
          r.kind !== 'primitive' && selField.subgraphs.includes(r.subgraph),
      );
    }
    if (!resolverPlan && selType.kind === 'interface') {
      // try resolving the field from an implementing type of the interface
      const implementingObjectTypeWithSelField = Object.values(blueprint.types)
        .filter((t): t is BlueprintObject => t.kind === 'object')
        .filter((t) => implementsInterface(t, selType.name))
        .find((t) => !!t.fields[selField.name]);

      // TODO: choose the right resolver when multiple
      resolverPlan = Object.values(
        implementingObjectTypeWithSelField?.resolvers || [],
      ).flat()[0];
    }
    if (!resolverPlan) {
      throw new Error(
        `Blueprint type "${selType.name}" doesn't have a resolver for the "${selField.name}" field`,
      );
    }

    resolver = prepareCompositeResolverForSelection(
      resolverPlan,
      sel,
      getSelectionsAtDepth(currentResolver.exports, depth),
    );

    if (resolvingAdditionalFields) {
      currentResolver.includes[''] ??= [];
      currentResolver.includes[''].push(resolver);
    } else {
      currentResolver.includes[
        parentSel.kind === 'fragment' ? parentSel.fieldName : parentSel.name
      ] = resolver;
    }
  }

  const exp: OperationObjectExport | OperationPrimitiveExport =
    sel.kind === 'scalar'
      ? {
          kind: 'scalar',
          name: sel.name,
          prop: sel.prop,
        }
      : sel.kind === 'enum'
        ? {
            kind: 'enum',
            name: sel.name,
            prop: sel.prop,
            values: sel.values,
          }
        : {
            kind: 'object',
            name: sel.name,
            prop: sel.prop,
            selections: [],
          };

  const dest =
    resolver === currentResolver
      ? getSelectionsAtDepth(currentResolver.exports, depth)
      : resolver.exports;

  if (!exportsIncludeField(dest, exp.prop, true)) {
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
        // we increase depth if we're staying in the same resolver because that means that
        // the subselections are within a composite field
        resolver === currentResolver ||
          // we also increase depth if we have been resolving additional fields because that
          // means that the subselections are also within a composite field but we're not
          // resolving additional fields any more
          resolvingAdditionalFields
          ? depth + 1
          : depth,
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
        kind: 'scalar', // TODO: do variables always select scalars, what happens with enums?
        name: variable.select,
        prop: variable.select,
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
  prop: string,
  /** Whether to convert private exports to public ones if the field is found. */
  convertToPublic: boolean,
) {
  for (const exp of exps) {
    if (exp.kind === 'fragment') {
      return exportsIncludeField(exp.selections, prop, convertToPublic);
    }
    if (exp.prop === prop) {
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
      resolver.kind === 'primitive' ? [] : resolver.exports,
    );
    resolver.operation = operation;
    resolver.pathToExportData = [
      ...pathToExportData,
      // we append the original path because it may contain additional paths
      // (see creating resolvers in insertResolversForGatherPlanCompositeField)
      ...resolver.pathToExportData,
    ];
    if ('includes' in resolver) {
      buildAndInsertOperationsInResolvers(
        Object.values(resolver.includes).flat(),
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
        ...(exp.prop !== exp.name
          ? {
              alias: {
                kind: Kind.NAME,
                value: exp.prop,
              },
            }
          : {}),
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
        ...(exp.prop !== exp.name
          ? {
              alias: {
                kind: Kind.NAME,
                value: exp.prop,
              },
            }
          : {}),
      });
    }
  }
  return sels;
}

function implementsInterface(
  objectType: BlueprintObject,
  interfaceTypeName: string,
) {
  return objectType.implements[interfaceTypeName]?.name === interfaceTypeName;
}
