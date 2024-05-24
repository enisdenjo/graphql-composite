import {
  ASTNode,
  DirectiveDefinitionNode,
  DirectiveNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectFieldNode,
  ObjectTypeDefinitionNode,
  OperationTypeNode,
  print,
  ScalarTypeDefinitionNode,
  specifiedScalarTypes,
  TypeDefinitionNode,
  UnionTypeDefinitionNode,
  VariableDefinitionNode,
  visit,
} from 'graphql';
import type {
  Blueprint,
  BlueprintCompositeResolver,
  BlueprintField,
  BlueprintImplements,
  BlueprintInterface,
  BlueprintInterfaceResolver,
  BlueprintObject,
  BlueprintObjectResolver,
  BlueprintResolverUserVariable,
  BlueprintResolverVariable,
  BlueprintTypeResolver,
} from '../blueprint.js';
import {
  assert,
  readBaseTypeName,
  TypeNodeInfo,
  visitWithTypeNodeInfo,
} from '../utils.js';
import {
  JoinFieldMetadata,
  JoinTypeMetadata,
  readGraphs,
  readJoinFieldMetadata,
  readJoinImplementsMetadata,
  readJoinTypeMetadata,
  readSchemaDefinition,
} from './metadata.js';
import type { GraphID, GraphName } from './types.js';

type Context = ReturnType<typeof buildContext>;

export function readSubgraphs(
  supergraphDocument: DocumentNode,
): [GraphName, string][] {
  const graphs = readGraphs(supergraphDocument);

  const subgraphs: [GraphName, string][] = [];

  for (const graph of Object.entries(graphs)) {
    subgraphs.push([graph[1].name, graph[1].url!]);
  }

  return subgraphs;
}

/**
 * Builds a blueprint from a supergraph document.
 */
export function buildBlueprintFromFederation(
  supergraphDocument: DocumentNode,
): Blueprint {
  /**
   * We deliberately omit the schema field here,
   * because we build it as we traverse the document
   * and print it at the end.
   */
  const blueprint: Omit<Blueprint, 'schema'> = {
    types: {},
  };
  const schemaDefinition = readSchemaDefinition(supergraphDocument);
  const context = buildContext(supergraphDocument, blueprint);

  const typeNameToOperationTypeMap = {
    [schemaDefinition.query]: OperationTypeNode.QUERY,
    [schemaDefinition.mutation]: OperationTypeNode.MUTATION,
    [schemaDefinition.subscription]: OperationTypeNode.SUBSCRIPTION,
  };

  // We need to collect metadata about types before we start building the blueprint.
  // Everything that needs to be known upfront, lands in this loop.
  for (const node of supergraphDocument.definitions) {
    if (isTypeDefinitionNode(node)) {
      context.typeDefinitionMap.add(node);
    }

    if (
      node.kind === Kind.OBJECT_TYPE_DEFINITION ||
      node.kind === Kind.INTERFACE_TYPE_DEFINITION
    ) {
      const objectOrInterfaceTypeName = node.name.value;
      // Store metadata about the type for later use
      context.joinTypes.set(
        objectOrInterfaceTypeName,
        readJoinTypeMetadata(node.directives),
      );
    } else if (node.kind === Kind.UNION_TYPE_DEFINITION) {
      const unionTypeName = node.name.value;
      // Store metadata about the type for later use
      context.joinTypes.set(
        unionTypeName,
        readJoinTypeMetadata(node.directives),
      );
    }
  }

  for (const node of supergraphDocument.definitions) {
    if (
      node.kind === Kind.OBJECT_TYPE_DEFINITION ||
      node.kind === Kind.INTERFACE_TYPE_DEFINITION
    ) {
      const objectOrInterfaceTypeName = node.name.value;
      const joinImplementsList = readJoinImplementsMetadata(node.directives);

      for (const joinImplements of joinImplementsList) {
        context.implementations.add(
          objectOrInterfaceTypeName,
          joinImplements.interface,
          context.graphIdToName(joinImplements.graph),
        );

        // If the interface is an @interfaceObject, then we must "fake" it a bit,
        // and encode in the blueprint that the object type implements the interface in subgraphs
        // where the interface is an @interfaceObject.
        // If `@interfaceObject` is defined in subgraph A and B, but regular interface is in subgraph C,
        // we mark the object type as implementing the interface in A (fake), B (fake) and C (real).
        const joinTypeList = context.joinTypes.get(joinImplements.interface);
        for (const joinType of joinTypeList) {
          if (joinType.isInterfaceObject) {
            context.implementations.add(
              objectOrInterfaceTypeName,
              joinImplements.interface,
              context.graphIdToName(joinType.graph),
            );
          }
        }
      }
    } else if (node.kind === Kind.UNION_TYPE_DEFINITION) {
      const unionTypeName = node.name.value;

      for (const namedNode of node.types ?? []) {
        const unionMemberTypeName = namedNode.name.value;
        const joinTypeList = context.joinTypes.get(unionMemberTypeName);
        for (const joinType of joinTypeList) {
          context.implementations.add(
            unionMemberTypeName,
            unionTypeName,
            context.graphIdToName(joinType.graph),
          );
        }
        // TODO: find a better name for context.implementations
        // context.implementations.add(unionMemberTypeName, unionTypeName);
      }
    }
  }

  const typeNodeInfo = new TypeNodeInfo();
  // Builds the public schema document and blueprint at the same time
  const publicSchemaDocument = visit(
    // First visit is to build the blueprint
    visit(
      supergraphDocument,
      visitWithTypeNodeInfo(typeNodeInfo, {
        ObjectTypeDefinition(node) {
          if (
            node.name.value === schemaDefinition.query ||
            node.name.value === schemaDefinition.mutation ||
            node.name.value === schemaDefinition.subscription
          ) {
            planRootType(node.name.value, context);
          } else {
            planObjectType(node, context);
          }
          return node;
        },
        InterfaceTypeDefinition(node) {
          planInterfaceType(node, context);
          return node;
        },
        UnionTypeDefinition(node) {
          planUnionType(node, context);
          return node;
        },
        FieldDefinition(node) {
          const typeDef = typeNodeInfo.getTypeDef();
          assert(typeDef, 'Field definition not in the type definition');

          const joinFieldList = readJoinFieldMetadata(node.directives);

          if (typeDef.kind === Kind.OBJECT_TYPE_DEFINITION) {
            const typeName = typeDef.name.value;
            const operationType = typeNameToOperationTypeMap[typeName];

            if (operationType) {
              planRootField(
                node,
                operationType,
                typeName,
                joinFieldList,
                context,
              );
              return node;
            }

            planObjectField(node, typeDef, joinFieldList, context);
          } else if (typeDef.kind === Kind.INTERFACE_TYPE_DEFINITION) {
            planInterfaceField(node, typeDef, joinFieldList, context);
          }

          return node;
        },
        Directive(node) {
          // Remove federation directives from the public schema
          return isFederationDirective(node) ? null : node;
        },
        DirectiveDefinition(node) {
          // Remove federation directive definitions from the public schema
          return isFederationDirective(node) ||
            node.name.value === 'inaccessible'
            ? null
            : node;
        },
        ScalarTypeDefinition(node) {
          // Remove federation scalar type definitions from the public schema
          return isFederationTypeDefinition(node) ? null : node;
        },
        EnumTypeDefinition(node) {
          // Remove federation enum type definitions from the public schema
          return isFederationTypeDefinition(node) ? null : node;
        },
      }),
    ),
    // Second visit is to remove inaccessible parts from the public schema
    {
      enter(node) {
        if (isInaccessible(node)) {
          return null;
        }

        return node;
      },
    },
  );

  return {
    schema: print(publicSchemaDocument),
    types: blueprint.types,
  };
}

function isInaccessible(node: ASTNode) {
  return (
    'directives' in node &&
    node.directives?.some((d) => d.name.value === 'inaccessible')
  );
}

function planRootType(typeName: string, context: Context) {
  const __typename = createBlueprintField(
    '__typename',
    typeName,
    'String!',
    [],
    context,
  );

  context.blueprint.types[typeName] = {
    kind: 'object',
    name: typeName,
    implements: {}, // TODO: should root types even have implementations?
    resolvers: {},
    fields: {},
  };

  if (__typename) {
    context.blueprint.types[typeName]!.fields['__typename'] = __typename;
  }
}

function planObjectType(node: ObjectTypeDefinitionNode, context: Context) {
  const resolvers: {
    [name: GraphName]: BlueprintObjectResolver[];
  } = {};
  const typeName = node.name.value;
  const joinTypeList = context.joinTypes.get(typeName);

  for (const joinType of joinTypeList) {
    if (isResolvableEntity(joinType)) {
      const graphName = context.graphIdToName(joinType.graph);

      if (!resolvers[graphName]) {
        resolvers[graphName] = [];
      }

      resolvers[graphName]!.push(
        createEntityResolver({
          kind: 'object',
          typeDef: node,
          graphName,
          ofType: typeName,
          key: joinType.key,
        }),
      );
    }
  }

  const __typename = createBlueprintField(
    '__typename',
    typeName,
    'String!',
    [],
    context,
  );
  // Every object type has a __typename field
  assert(__typename, 'Expected __typename field to be created');

  context.blueprint.types[typeName] = {
    kind: 'object',
    name: typeName,
    implements: context.implementations.get(typeName),
    resolvers,
    fields: {
      __typename,
    },
  };
}

function planInterfaceType(
  node: InterfaceTypeDefinitionNode,
  context: Context,
) {
  const resolvers: {
    [name: GraphName]: BlueprintInterfaceResolver[];
  } = {};
  const interfaceTypeName = node.name.value;
  const joinTypeList = context.joinTypes.get(interfaceTypeName);

  for (const joinType of joinTypeList) {
    // Only interface types with a @key(resolvable: true, key: "...") can resolve fields.
    if (isResolvableEntity(joinType)) {
      const graphName = context.graphIdToName(joinType.graph);

      if (!resolvers[graphName]) {
        resolvers[graphName] = [];
      }

      resolvers[graphName]!.push(
        createEntityResolver({
          kind: 'interface',
          typeDef: node,
          graphName,
          ofType: interfaceTypeName,
          key: joinType.key,
        }),
      );
    }
  }

  context.blueprint.types[interfaceTypeName] = {
    kind: 'interface',
    name: interfaceTypeName,
    resolvers,
    fields: {},
  };

  const __typename = createBlueprintField(
    '__typename',
    interfaceTypeName,
    'String!',
    [],
    context,
  );

  // Not all interfaces can resolve __typename, the exception is @interfaceObject
  if (__typename) {
    // TODO: check if __typename should be added only if at least one object type implements the interface
    context.blueprint.types[interfaceTypeName]!.fields['__typename'] =
      __typename;
  }
}

function planUnionType(node: UnionTypeDefinitionNode, context: Context) {
  const typeName = node.name.value;

  context.blueprint.types[typeName] = {
    kind: 'interface',
    name: typeName,
    resolvers: {},
    fields: {},
  };

  const __typename = createBlueprintField(
    '__typename',
    typeName,
    'String!',
    [],
    context,
  );

  if (__typename) {
    context.blueprint.types[typeName]!.fields['__typename'] = __typename;
  }
}

function planRootField(
  node: FieldDefinitionNode,
  operationType: OperationTypeNode,
  typeName: string,
  joinFieldList: JoinFieldMetadata[],
  context: Context,
) {
  const fieldName = node.name.value;
  const fields = context.blueprint.types[typeName]?.fields;
  assert(fields, `Expected ${typeName} fields to be defined`);

  const resolvers: Record<GraphName, BlueprintTypeResolver> = {};
  const baseOutputTypeName = readBaseTypeName(node.type);
  const outputTypeDef = context.typeDefinitionMap.get(baseOutputTypeName);
  const outputTypePrinted = print(node.type);
  assert(outputTypeDef, `Type ${baseOutputTypeName} not found`);

  const joinTypeList = context.joinTypes.get(typeName);

  const types: {
    [subgraph in BlueprintTypeResolver['subgraph']]: string;
  } = {};

  let subgraphs: GraphName[] = [];
  const subgraphsToIgnore: GraphName[] = [];

  for (const joinField of joinFieldList) {
    if (joinField.override) {
      subgraphsToIgnore.push(joinField.override);
    }
  }

  for (const joinField of joinFieldList) {
    assert(joinField.graph, `Expected graph argument in @join__field`);
    const subgraphName = context.graphIdToName(joinField.graph);

    if (subgraphsToIgnore.includes(subgraphName)) {
      // Skip the field if it's overridden
      continue;
    }

    subgraphs.push(subgraphName);

    if (joinField.type) {
      // @join__field(type) existence, could mean that there's either a difference between subgraphs
      // in terms of type modifiers (e.g. List, NonNull)
      // or it's a union member
      // or object type implementing an interface.
      const baseOutputTypeName = readBaseTypeName(joinField.type);
      const outputTypeDef = context.typeDefinitionMap.get(baseOutputTypeName);
      assert(outputTypeDef, `Type ${baseOutputTypeName} not found`);
      const kind = resolveKindFromTypeDefinition(outputTypeDef);

      resolvers[subgraphName] = createRootResolver({
        kind,
        node,
        graphName: subgraphName,
        type: joinField.type,
        ofType: baseOutputTypeName,
        operationType,
      });
      types[subgraphName] = joinField.type;
    } else {
      const kind = resolveKindFromTypeDefinition(outputTypeDef);

      resolvers[subgraphName] = createRootResolver({
        kind,
        node,
        graphName: subgraphName,
        type: outputTypePrinted,
        ofType: baseOutputTypeName,
        operationType,
      });

      types[subgraphName] = outputTypePrinted;
    }
  }

  // If a field is not annotated with @join__field(graph:),
  // it means it's resolvable by all subgraphs implementing the type.
  if (joinFieldList.length === 0) {
    const kind = resolveKindFromTypeDefinition(outputTypeDef);
    for (const joinType of joinTypeList) {
      const subgraphName = context.graphIdToName(joinType.graph);
      subgraphs.push(subgraphName);

      resolvers[subgraphName] = createRootResolver({
        kind,
        node,
        graphName: subgraphName,
        type: outputTypePrinted,
        ofType: baseOutputTypeName,
        operationType,
      });

      types[subgraphName] = outputTypePrinted;
    }
  }

  fields[fieldName] = {
    name: fieldName,
    resolvers,
    subgraphs,
    types,
  };

  return {
    name: fieldName,
    resolvers,
  };
}

function planObjectField(
  node: FieldDefinitionNode,
  typeDef: ObjectTypeDefinitionNode,
  joinFieldList: JoinFieldMetadata[],
  context: Context,
) {
  const fieldName = node.name.value;
  const blueprintType = ensureBlueprintObject(
    context.blueprint.types,
    typeDef.name.value,
  );

  const field = createBlueprintField(
    fieldName,
    typeDef.name.value,
    print(node.type),
    joinFieldList,
    context,
  );

  if (field) {
    blueprintType.fields[fieldName] = field;
  }
}

function planInterfaceField(
  node: FieldDefinitionNode,
  typeDef: InterfaceTypeDefinitionNode,
  joinFieldList: JoinFieldMetadata[],
  context: Context,
) {
  const fieldName = node.name.value;
  const blueprintType = ensureBlueprintInterface(
    context.blueprint.types,
    typeDef.name.value,
  );

  const field = createBlueprintField(
    fieldName,
    typeDef.name.value,
    print(node.type),
    joinFieldList,
    context,
  );

  if (field) {
    blueprintType.fields[fieldName] = field;
  }
}

/**
 * Creates a blueprint field from a field definition node.
 * Supports __typename field.
 *
 * When this function returns `null`, it means that the field should not be created.
 */
function createBlueprintField(
  fieldName: string,
  typeName: string,
  outputType: string,
  /**
   * Output of print(node.type).
   * Examples:
   *  - [User!]
   *  - User
   *
   * It is not the name of the type, but the actual output type.
   */
  joinFieldList: JoinFieldMetadata[],
  context: Context,
): BlueprintField | null {
  const joinTypeList = context.joinTypes.get(typeName);
  let subgraphNames: GraphName[] = [];

  const types: {
    [subgraph in BlueprintTypeResolver['subgraph']]: string;
  } = {};

  // __typename is a special field
  if (fieldName === '__typename') {
    for (const joinType of joinTypeList) {
      const subgraphName = context.graphIdToName(joinType.graph);
      // Object types annotated with @interfaceObject cannot resolve `__typename`.
      // They simulate an interface, but they are not real interfaces,
      // so none of the object types in the subgraph implement the interface.
      // Therefore, the `__typename` field would be invalid as it has to represent an object type.
      if (!joinType.isInterfaceObject) {
        subgraphNames.push(subgraphName);
      }

      types[subgraphName] = outputType;
    }

    return {
      name: fieldName,
      subgraphs: subgraphNames,
      resolvers: {},
      types,
    };
  }

  const subgraphsToIgnore: GraphName[] = [];

  for (const joinField of joinFieldList) {
    if (joinField.override) {
      subgraphsToIgnore.push(joinField.override);
    }
  }

  for (const joinField of joinFieldList) {
    if (typeof joinField.graph === 'undefined') {
      // If there is a field with no @join__field but without the graph argument,
      // it means it's a field contributed by an interface object type.
      // The field does not really exist on the object type.
      return null;
    }

    const subgraphName = context.graphIdToName(joinField.graph);

    if (subgraphsToIgnore.includes(subgraphName)) {
      // Skip the field if it's overridden
      continue;
    }

    if (isFieldResolvable(joinField, joinTypeList)) {
      subgraphNames.push(context.graphIdToName(joinField.graph));
      types[subgraphName] = joinField.type ?? outputType;
    }
  }

  // If a field is not annotated with @join__field(graph:),
  // it means it's resolvable by all subgraphs implementing the type.
  if (subgraphNames.length === 0) {
    for (const joinType of joinTypeList) {
      const subgraphName = context.graphIdToName(joinType.graph);
      subgraphNames.push(subgraphName);
      types[subgraphName] = outputType;
    }
  }

  return {
    name: fieldName,
    subgraphs: subgraphNames,
    resolvers: {},
    types,
  };
}

function ensureBlueprintObject(
  types: Blueprint['types'],
  name: string,
): BlueprintObject {
  const record = types[name];

  assert(record, `Type ${name} not found in blueprint`);
  assert(record.kind === 'object', `Type ${name} is not an object`);

  return record;
}

function ensureBlueprintInterface(
  types: Blueprint['types'],
  name: string,
): BlueprintInterface {
  const record = types[name];

  assert(record, `Type ${name} not found in blueprint`);
  assert(record.kind === 'interface', `Type ${name} is not an interface`);

  return record;
}

/**
 * Returns true if the field is resolvable by the subgraph.
 *
 * In Federation v2, every field that is marked as external is not resolvable by the subgraph.
 * In Federation v1, in type extensions, the key fields must be marked with @external
 * and they have to be resolvable by the subgraph.
 * The only way to tell if `external` field can be resolved or not is the `extension` boolean.
 * A field that is both `external` and `extension` can be resolved by a subgraph,
 * but only if external field is part of key fields.
 */
function isFieldResolvable(
  joinField: JoinFieldMetadata,
  joinTypeList: JoinTypeMetadata[],
): boolean {
  // TODO: implement what I described above
  const isExtension = joinTypeList
    .filter((joinType) => joinType.graph === joinField.graph)
    .some((joinType) => joinType.extension);

  if (joinField.external && !isExtension) {
    return false;
  }

  return true;
}

function createRootResolver(input: {
  kind: BlueprintTypeResolver['kind'];
  node: FieldDefinitionNode;
  graphName: GraphName;
  type: string;
  ofType: string;
  operationType: OperationTypeNode;
}): BlueprintTypeResolver {
  const variableList: {
    blueprint: BlueprintResolverUserVariable;
    node: VariableDefinitionNode;
  }[] = [];

  for (const arg of input.node.arguments ?? []) {
    variableList.push({
      blueprint: {
        kind: 'user',
        name: arg.name.value,
      },
      node: {
        kind: Kind.VARIABLE_DEFINITION,
        variable: {
          kind: Kind.VARIABLE,
          name: {
            kind: Kind.NAME,
            value: arg.name.value,
          },
        },
        type: arg.type,
      },
    });
  }

  const operation = print({
    kind: Kind.DOCUMENT,
    definitions: [
      {
        kind: Kind.OPERATION_DEFINITION,
        operation: input.operationType,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [
            {
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: input.node.name.value,
              },
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: [createFragmentSpread('__export')],
              },
              arguments:
                input.node.arguments?.map((arg) => ({
                  kind: Kind.ARGUMENT,
                  name: {
                    kind: Kind.NAME,
                    value: arg.name.value,
                  },
                  value: {
                    kind: Kind.VARIABLE,
                    name: {
                      kind: Kind.NAME,
                      value: arg.name.value,
                    },
                  },
                })) ?? [],
            },
          ],
        },
        variableDefinitions: variableList.map((v) => v.node),
      },
    ],
  } satisfies DocumentNode);

  const subgraph = input.graphName;
  const type = input.type;
  const ofType = input.ofType;
  const variables = Object.fromEntries(
    variableList.map((v) => [v.node.variable.name.value, v.blueprint]),
  );

  if (input.kind === 'interface') {
    return {
      kind: input.kind,
      subgraph,
      type,
      ofType,
      operation,
      variables,
    };
  }

  return {
    kind: input.kind,
    subgraph,
    type,
    ofType,
    operation,
    variables,
  };
}

function createEntityResolver(input: {
  kind: BlueprintInterfaceResolver['kind'];
  graphName: GraphName;
  typeDef: InterfaceTypeDefinitionNode;
  ofType: string;
  key: string;
}): BlueprintInterfaceResolver;
function createEntityResolver(input: {
  kind: BlueprintObjectResolver['kind'];
  graphName: GraphName;
  typeDef: ObjectTypeDefinitionNode;
  ofType: string;
  key: string;
}): BlueprintObjectResolver;
function createEntityResolver(input: {
  kind: 'interface' | 'object';
  typeDef: InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode;
  graphName: GraphName;
  ofType: string;
  key: string;
}): BlueprintCompositeResolver {
  const variableList: {
    blueprint: BlueprintResolverVariable;
    node: VariableDefinitionNode;
  }[] = [];

  const fields = parseKeyFields(input.key);

  for (const field of fields) {
    const fieldDef = input.typeDef.fields?.find((f) => f.name.value === field);
    assert(fieldDef, `Field ${field} not found in ${input.typeDef.name.value}`);

    variableList.push({
      blueprint: {
        kind: 'select',
        name: field,
        select: field,
      },
      node: {
        kind: Kind.VARIABLE_DEFINITION,
        variable: {
          kind: Kind.VARIABLE,
          name: {
            kind: Kind.NAME,
            value: field,
          },
        },
        type: fieldDef.type,
      },
    });
  }

  const operation = print({
    kind: Kind.DOCUMENT,
    definitions: [
      {
        kind: Kind.OPERATION_DEFINITION,
        operation: OperationTypeNode.QUERY,
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [
            {
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: '_entities',
              },
              arguments: [
                {
                  kind: Kind.ARGUMENT,
                  name: {
                    kind: Kind.NAME,
                    value: 'representations',
                  },
                  value: {
                    kind: Kind.LIST,
                    values: [
                      {
                        kind: Kind.OBJECT,
                        fields: (
                          [
                            // Always include __typename in the representation
                            {
                              kind: Kind.OBJECT_FIELD,
                              name: {
                                kind: Kind.NAME,
                                value: '__typename',
                              },
                              value: {
                                kind: Kind.STRING,
                                value: input.ofType,
                              },
                            },
                          ] as ObjectFieldNode[]
                        ).concat(
                          variableList.map((v) => ({
                            kind: Kind.OBJECT_FIELD,
                            name: {
                              kind: Kind.NAME,
                              value: v.blueprint.name,
                            },
                            value: {
                              kind: Kind.VARIABLE,
                              name: v.node.variable.name,
                            },
                          })),
                        ),
                      },
                    ],
                  },
                },
              ],
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: [createInlineFragmentWithExport(input.ofType)],
              },
            },
          ],
        },
        variableDefinitions: variableList.map((v) => v.node),
      },
    ],
  } satisfies DocumentNode);

  const subgraph = input.graphName;
  const type = `[${input.ofType}]!`;
  const ofType = input.ofType;
  const variables = Object.fromEntries(
    variableList.map((v) => [v.node.variable.name.value, v.blueprint]),
  );

  return {
    kind: input.kind,
    subgraph,
    type,
    ofType,
    operation,
    variables,
  };
}

function createFragmentSpread(name: string): FragmentSpreadNode {
  return {
    kind: Kind.FRAGMENT_SPREAD,
    name: {
      kind: Kind.NAME,
      value: name,
    },
  };
}

function createInlineFragmentWithExport(typeName: string): InlineFragmentNode {
  return {
    kind: Kind.INLINE_FRAGMENT,
    typeCondition: {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: typeName,
      },
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [createFragmentSpread('__export')],
    },
  };
}

function isFederationDirective(node: DirectiveNode | DirectiveDefinitionNode) {
  return node.name.value.startsWith('join__') || node.name.value === 'link';
}

function isFederationTypeDefinition(
  node: ScalarTypeDefinitionNode | EnumTypeDefinitionNode,
) {
  return (
    node.name.value.startsWith('join__') || node.name.value.startsWith('link__')
  );
}

/**
 * Creates a function that finds type definitions by name.
 * It caches the results to avoid multiple lookups.
 *
 * NOTE: Let's see if looping over and over again is more efficient than building a map upfront.
 */
function createTypeDefinitionMap() {
  const typeMap = new Map<string, TypeDefinitionNode | undefined>();

  for (const scalarType of specifiedScalarTypes) {
    typeMap.set(scalarType.name, {
      kind: Kind.SCALAR_TYPE_DEFINITION,
      name: {
        kind: Kind.NAME,
        value: scalarType.name,
      },
    } satisfies ScalarTypeDefinitionNode);
  }

  return {
    add(type: TypeDefinitionNode) {
      typeMap.set(type.name.value, type);
    },
    get(name: string) {
      return typeMap.get(name);
    },
  };
}

function isTypeDefinitionNode(node: ASTNode): node is TypeDefinitionNode {
  return (
    node.kind === Kind.SCALAR_TYPE_DEFINITION ||
    node.kind === Kind.OBJECT_TYPE_DEFINITION ||
    node.kind === Kind.INTERFACE_TYPE_DEFINITION ||
    node.kind === Kind.UNION_TYPE_DEFINITION ||
    node.kind === Kind.ENUM_TYPE_DEFINITION ||
    node.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION
  );
}

/**
 * Parses key fields from a string.
 * Returns an array of key fields.
 *
 * TODO: improve it once we have a better support for variables and for nested fields.
 */
function parseKeyFields(keyFields: string) {
  return keyFields.split(' ').map((f) => f.trim());
}

/**
 * Produces a resolver kind based on the type definition node.
 */
function resolveKindFromTypeDefinition(
  node: TypeDefinitionNode,
): 'object' | 'interface' | 'primitive' | never {
  switch (node.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return 'object';
    case Kind.UNION_TYPE_DEFINITION:
    case Kind.INTERFACE_TYPE_DEFINITION:
      return 'interface';
    case Kind.ENUM_TYPE_DEFINITION:
    case Kind.SCALAR_TYPE_DEFINITION:
      return 'primitive';
    default:
      throw new Error(`Unsupported type definition kind: ${node.kind}`);
  }
}

/**
 * Check if a type was annotated with @key(resolvable: true, key: "...") directive.
 * If it was, it means that the type is an entity and is resolvable by the subgraph.
 * It means that fields of the type can be requested by the gateway.
 */
function isResolvableEntity(
  joinType: JoinTypeMetadata,
): joinType is JoinTypeMetadata & { key: string; resolvable: true } {
  return joinType.resolvable && !!joinType.key;
}

function trackJoinTypes() {
  /**
   * Stores metadata about types.
   * It's helpful to have this map, to assign fields to subgraphs
   * in case when join__field is not present
   */
  const joinTypeMap = new Map<string, JoinTypeMetadata[]>();

  return {
    set(typeName: string, list: JoinTypeMetadata[]) {
      joinTypeMap.set(typeName, list);
    },
    get(typeName: string) {
      const joinTypeList = joinTypeMap.get(typeName);
      assert(joinTypeList, `Type metadata not found for ${typeName}`);
      return joinTypeList;
    },
  };
}

/**
 * Record information about implementations of interfaces and union types.
 */
function trackImplementations() {
  const implementationsMap = new Map<string, Record<string, GraphName[]>>();

  return {
    /**
     * Store an information that the object type implements the interface or is part of the union type
     */
    add(
      objectTypeName: string,
      interfaceOrUnionTypeName: string,
      graphName: GraphName,
    ) {
      const record = implementationsMap.get(objectTypeName);

      if (!record) {
        implementationsMap.set(objectTypeName, {
          [interfaceOrUnionTypeName]: [graphName],
        });
        return;
      }

      if (!record[interfaceOrUnionTypeName]) {
        record[interfaceOrUnionTypeName] = [graphName];
        return;
      }

      record[interfaceOrUnionTypeName]!.push(graphName);
    },
    /**
     * Get a list of interfaces or union types that the object type is part of
     */
    get(objectTypeName: string) {
      const impl: {
        [name in BlueprintInterface['name']]: BlueprintImplements;
      } = {};

      const record = implementationsMap.get(objectTypeName);

      if (!record) {
        return impl;
      }

      for (const name in record) {
        const subgraphs = record[name];

        if (!subgraphs || !subgraphs.length) {
          continue;
        }

        impl[name] = {
          name,
          subgraphs,
        };
      }

      return impl;
    },
  };
}

function buildContext(
  supergraphDocument: DocumentNode,
  partialBlueprint: Omit<Blueprint, 'schema'>,
) {
  /**
   * Stores metadata about graphs
   */
  const graphs = readGraphs(supergraphDocument);

  return {
    typeDefinitionMap: createTypeDefinitionMap(),
    graphs,
    blueprint: partialBlueprint,
    joinTypes: trackJoinTypes(),
    implementations: trackImplementations(),
    graphIdToName(graphId: GraphID) {
      const graph = graphs[graphId];
      assert(graph, `Graph ${graphId} not found`);
      return graph.name;
    },
  };
}
