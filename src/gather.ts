import {
  ASTNode,
  buildSchema,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  getNamedType,
  isCompositeType,
  Kind,
  OperationTypeNode,
  parse,
  print,
  SelectionSetNode,
  TypeInfo,
  valueFromAST,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import {
  SchemaPlan,
  SchemaPlanCompositeResolver,
  SchemaPlanScalarResolver,
  SchemaPlanSubgraph,
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
  extends SchemaPlanSubgraph,
    SchemaPlanCompositeResolver {
  /**
   * The field in user's operation this resolver resolves
   * at the location of this resolver in the structure.
   */
  field: GatherPlanResolverField;
  /** The path to the `__export` fragment in the execution result. */
  pathToExportData: string[];
  /**
   * Dot-notation flat list of field paths to add to the `__export`
   * fragment on the query that are NOT available in the final result,
   * but only to the included resolvers.
   *
   * Often used when parent has to resolve additional fields for the includes.
   */
  private: string[];
  /**
   * Dot-notation flat list of field paths to add to the `__export`
   * fragment on the query that are also available in the final result.
   */
  public: string[];
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

export interface GatherPlanScalarResolver
  extends SchemaPlanSubgraph,
    SchemaPlanScalarResolver {
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

export interface GatherPlanResolverField {
  kind: 'scalar' | 'composite';
  /** Dot-notation path to the field in user's operation. */
  path: string;
  /**
   * The name of the field in user's operation.
   * It matches the last part of {@link path field's path}.
   */
  name: string;
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
  /** The inline variables of the field. */
  inlineVariables: Record<string, unknown>;
}

export function planGather(
  schemaPlan: SchemaPlan,
  doc: DocumentNode,
): GatherPlan {
  const gatherPlan: GatherPlan = {
    query: print(doc),
    operations: [],
  };

  const fields: Field[] = [];
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
              type: String(type),
              ofType: ofType.name,
              inlineVariables,
              fields: [],
            });
          } else {
            insertFieldAtDepth(fields, entries.length - 1, {
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

type Field = FieldComposite | FieldScalar;

interface FieldComposite extends GatherPlanResolverField {
  kind: 'composite';
  fields: Field[];
}

interface FieldScalar extends GatherPlanResolverField {
  kind: 'scalar';
}

function fieldToResolverField(field: Field): GatherPlanResolverField {
  return {
    // we write out the props to avoid any extra ones (like the `fields` property)
    kind: field.kind,
    path: field.path,
    name: field.name,
    type: field.type,
    ofType: field.ofType,
    inlineVariables: field.inlineVariables,
  };
}

function insertFieldAtDepth(fields: Field[], depth: number, field: Field) {
  let curr = { fields };
  for (let i = 0; i < depth; i++) {
    // increase depth by going into the last field of the current field
    const field = curr.fields[curr.fields.length - 1]!;
    if (field.kind !== 'composite') {
      throw new Error(
        `Cannot add a field at depth ${depth} because it's not composite`,
      );
    }
    curr = field;
  }
  curr.fields.push(field);
}

function planGatherResolversForOperationFields(
  schemaPlan: SchemaPlan,
  operation: GatherPlanOperation,
  fields: Field[],
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

    const resolver =
      operationFieldResolver.kind === 'scalar'
        ? ({
            ...operationFieldResolver,
            field: fieldToResolverField(operationField),
            pathToExportData: [],
          } satisfies GatherPlanScalarResolver)
        : ({
            ...operationFieldResolver,
            field: fieldToResolverField(operationField),
            pathToExportData: [],
            private: [],
            public: [],
            includes: {},
          } satisfies GatherPlanCompositeResolver);

    if (operationField.kind !== resolver.kind) {
      throw new Error('Operation field kind and the resolver kind must match');
    }

    if (operationField.kind === 'composite' && resolver.kind === 'composite') {
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
  buildAndInsertOperationsInResolvers(Object.values(resolvers));

  return resolvers;
}

function insertResolversForGatherPlanCompositeField(
  schemaPlan: SchemaPlan,
  parent: FieldComposite,
  parentResolver: GatherPlanCompositeResolver,
  pathPrefix: string,
) {
  for (const field of parent.fields) {
    const typePlan = schemaPlan.compositeTypes[parent.ofType];
    if (!typePlan) {
      throw new Error(
        `Schema plan doesn't have the "${parent.ofType}" composite type`,
      );
    }

    const fieldPlan = typePlan.fields[field.name];
    if (!fieldPlan) {
      throw new Error(
        `Schema plan "${typePlan.name}" composite type doesn't have a "${field.name}" field`,
      );
    }

    let resolver = fieldPlan.subgraphs[parentResolver.name]
      ? parentResolver
      : Object.values(parentResolver.includes).find(
          (r) => fieldPlan.subgraphs[r.name],
        );
    if (!resolver) {
      // this field cannot be resolved from the parent's subgraph
      // add an dependant resolver to the parent for the field(s)

      const typePlan = schemaPlan.compositeTypes[parent.ofType];
      if (!typePlan) {
        throw new Error(
          `Schema plan doesn't have the "${parent.ofType}" composite type`,
        );
      }

      const resolverPlan = Object.values(typePlan.resolvers).find(
        (r) => fieldPlan.subgraphs[r.name],
      );
      if (!resolverPlan) {
        throw new Error(
          `Schema plan composite type "${typePlan.name}" doesn't have a resolver for any of the "${fieldPlan.name}" field subgraphs`,
        );
      }
      if (!Object.keys(resolverPlan.variables).length) {
        // TODO: composite type resolver must always have variables, right?
        throw new Error(
          `Schema plan composite type "${typePlan.name}" field "${fieldPlan.name}" resolver doesn't require variables`,
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
        field: fieldToResolverField(field),
        pathToExportData: [],
        private: [],
        public: [],
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
  resolvers: GatherPlanResolver[],
) {
  for (const resolver of resolvers) {
    const { operation, pathToExportData } = buildResolverOperation(
      resolver.operation,
      resolver.ofType,
      resolver.kind === 'scalar'
        ? []
        : [...resolver.public, ...resolver.private],
    );
    resolver.operation = operation;
    resolver.pathToExportData = pathToExportData;
    if (resolver.kind === 'composite') {
      buildAndInsertOperationsInResolvers(Object.values(resolver.includes));
    }
  }
}

export function buildResolverOperation(
  operation: string,
  type: string,
  /** List of dot-notation paths of fields for the resolving type. */
  fields: string[],
): { operation: string; pathToExportData: string[] } {
  const doc = parse(operation);
  const def = doc.definitions.find((d) => d.kind === Kind.OPERATION_DEFINITION);
  if (!def) {
    throw new Error(`No operation definition found in\n${operation}`);
  }

  if (!fields.length) {
    // no fields to select means we're resolving a scalar at the deepest field
    const pathToExportData = findDeepestFieldPath(def, []);
    if (!pathToExportData.length) {
      throw new Error(`Path to the deepest field not found in\n${operation}`);
    }
    return {
      operation: print(doc), // pretty print operation
      pathToExportData,
    };
  }

  const pathToExportData = findExportDataPath(def, []);
  if (!pathToExportData) {
    throw new Error(`Path to the __export fragment not found in\n${operation}`);
  }

  const docWithFragment: DocumentNode = {
    ...doc,
    definitions: [
      ...doc.definitions,
      {
        kind: Kind.FRAGMENT_DEFINITION,
        name: {
          kind: Kind.NAME,
          value: '__export',
        },
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: type,
          },
        },
        selectionSet: createSelectionSetForFields(fields),
      } satisfies FragmentDefinitionNode,
    ],
  };

  return {
    operation: print(docWithFragment), // pretty print operation
    pathToExportData,
  };
}

function findExportDataPath(node: ASTNode, path: string[]): string[] | null {
  if ('selectionSet' in node && node.selectionSet) {
    for (const child of node.selectionSet.selections) {
      if (
        child.kind === Kind.FRAGMENT_SPREAD &&
        child.name.value === '__export'
      ) {
        return path;
      }

      const foundPath = findExportDataPath(
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

function createSelectionSetForFields(fields: string[]): SelectionSetNode {
  const sel: SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [],
  };
  for (const paths of fields.map((f) => f.split('.'))) {
    let target: SelectionSetNode = sel;
    for (const field of paths) {
      let loc = (target.selections as FieldNode[]).find(
        (s) => s.name.value === field,
      );
      if (!loc) {
        loc = {
          kind: Kind.FIELD,
          name: { kind: Kind.NAME, value: field! },
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [],
          },
        };
        target.selections = [...target.selections, loc];
      }
      target = loc.selectionSet!;
    }
  }
  return sel;
}
