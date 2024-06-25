import { ConstDirectiveNode, DirectiveNode, DocumentNode, Kind } from 'graphql';
import { assert, assertNode } from '../utils.js';
import { GraphID, GraphName } from './types.js';

export function readJoinFieldMetadata(
  directives: readonly ConstDirectiveNode[] | undefined,
): JoinFieldMetadata[] {
  if (!directives) {
    return [];
  }

  const metadataList: JoinFieldMetadata[] = [];

  for (const node of directives) {
    if (node.name.value !== 'join__field') {
      continue;
    }

    let graph: GraphID | undefined = undefined;
    let requires: string | undefined = undefined;
    let provides: string | undefined = undefined;
    let type: string | undefined = undefined;
    let external: boolean = false;
    let override: GraphName | undefined = undefined;

    for (const arg of node.arguments ?? []) {
      const argName = arg.name.value;
      const argValue = arg.value;

      if (argName === 'graph') {
        assertNode(argValue, Kind.ENUM);
        graph = argValue.value as GraphID;
      } else if (argName === 'requires') {
        assertNode(argValue, Kind.STRING);
        requires = argValue.value;
      } else if (argName === 'provides') {
        assertNode(argValue, Kind.STRING);
        provides = argValue.value;
      } else if (argName === 'type') {
        assertNode(argValue, Kind.STRING);
        type = argValue.value;
      } else if (argName === 'external') {
        assertNode(argValue, Kind.BOOLEAN);
        external = argValue.value;
      } else if (argName === 'override') {
        assertNode(argValue, Kind.STRING);
        override = argValue.value as GraphName;
      }
    }

    metadataList.push({
      graph,
      requires,
      provides,
      type,
      external,
      override,
    });
  }

  return metadataList;
}

export function readJoinTypeMetadata(
  directives: readonly ConstDirectiveNode[] | undefined,
): JoinTypeMetadata[] {
  if (!directives) {
    return [];
  }

  const metadataList: JoinTypeMetadata[] = [];

  for (const node of directives) {
    if (node.name.value !== 'join__type') {
      continue;
    }

    let graph: GraphID | undefined = undefined;
    let key: string | undefined = undefined;
    let extension: boolean = false;
    let resolvable: boolean = true;
    let isInterfaceObject: boolean = false;

    for (const arg of node.arguments ?? []) {
      const argName = arg.name.value;
      const argValue = arg.value;

      if (argName === 'graph') {
        assertNode(argValue, Kind.ENUM);
        graph = argValue.value as GraphID;
      } else if (argName === 'key') {
        assertNode(argValue, Kind.STRING);
        key = argValue.value;
      } else if (argName === 'extension') {
        assertNode(argValue, Kind.BOOLEAN);
        extension = argValue.value;
      } else if (argName === 'resolvable') {
        assertNode(argValue, Kind.BOOLEAN);
        resolvable = argValue.value;
      } else if (argName === 'isInterfaceObject') {
        assertNode(argValue, Kind.BOOLEAN);
        isInterfaceObject = argValue.value;
      }
    }

    assert(graph, 'Expected graph argument in @join__type');

    metadataList.push({
      graph,
      key,
      extension,
      resolvable,
      isInterfaceObject,
    });
  }

  return metadataList;
}

export function readJoinImplementsMetadata(
  directives: readonly ConstDirectiveNode[] | undefined,
): JoinImplementsMetadata[] {
  if (!directives) {
    return [];
  }

  const metadataList: JoinImplementsMetadata[] = [];

  for (const node of directives) {
    if (node.name.value !== 'join__implements') {
      continue;
    }

    let graph: GraphID | undefined = undefined;
    let interfaceName: string | undefined = undefined;

    for (const arg of node.arguments ?? []) {
      const argName = arg.name.value;
      const argValue = arg.value;

      if (argName === 'graph') {
        assertNode(argValue, Kind.ENUM);
        graph = argValue.value as GraphID;
      } else if (argName === 'interface') {
        assertNode(argValue, Kind.STRING);
        interfaceName = argValue.value;
      }
    }

    assert(graph, 'Expected graph argument in @join__implements');
    assert(interfaceName, 'Expected interface argument in @join__implements');

    metadataList.push({
      graph,
      interface: interfaceName,
    });
  }

  return metadataList;
}

/**
 * Look for the schema definition in the supergraph document or use the default.
 * We need it in case Query is actually RootQuery.
 */
export function readSchemaDefinition(supergraphDocument: DocumentNode) {
  const schemaDefinition = supergraphDocument.definitions.find(
    (def) => def.kind === Kind.SCHEMA_DEFINITION,
  );

  assertNode(schemaDefinition, Kind.SCHEMA_DEFINITION);

  const schema = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };

  for (const operationType of schemaDefinition.operationTypes) {
    schema[operationType.operation] = operationType.type.name.value;
  }

  return schema;
}

/**
 * Looks for join__Graph enum and extracts metadata for each graph.
 * It's needed to know where to fetch the data from and what is the name of the graph.
 * Most of the federation directives use join__Graph enum values to reference the graph,
 * but sometimes (e.g. @join__field(override: "MyGraph")) we receive a name instead.
 *
 * This function builds a map that can be used to resolve the graph name from the enum value (id).
 *
 * TODO: pass service urls to the executor somehow
 */
export function readGraphs(
  supergraphDocument: DocumentNode,
): Record<GraphID, JoinGraphMetadata> {
  const joinGraphEnum = supergraphDocument.definitions.find(
    (def) =>
      def.kind === Kind.ENUM_TYPE_DEFINITION &&
      def.name.value === 'join__Graph',
  );
  assertNode(joinGraphEnum, Kind.ENUM_TYPE_DEFINITION);

  const graphs: Record<GraphID, JoinGraphMetadata> = {};

  for (const enumValue of joinGraphEnum.values ?? []) {
    const joinGraphMetadata = enumValue.directives
      ?.map(readJoinGraphMetadata)
      .filter((v): v is JoinGraphMetadata => !!v);

    if (!joinGraphMetadata || joinGraphMetadata.length === 0) {
      throw new Error(
        `Expected @join__graph directive on ${enumValue.name.value}`,
      );
    }

    if (joinGraphMetadata.length !== 1) {
      throw new Error(
        `Expected only one @join__graph directive on ${enumValue.name.value}`,
      );
    }

    graphs[enumValue.name.value as GraphID] = joinGraphMetadata[0]!;
  }

  return graphs;
}

function readJoinGraphMetadata(
  node: DirectiveNode,
): JoinGraphMetadata | undefined {
  if (node.name.value !== 'join__graph') {
    return;
  }

  let name: GraphName | undefined = undefined;
  let url: string | undefined = undefined;

  for (const arg of node.arguments ?? []) {
    const argName = arg.name.value;
    const argValue = arg.value;

    if (argName === 'name') {
      assertNode(argValue, Kind.STRING);
      name = argValue.value as GraphName;
    } else if (argName === 'url') {
      assertNode(argValue, Kind.STRING);
      url = argValue.value;
    }
  }

  assert(name, 'Expected name argument in @join__graph');

  return {
    name,
    url,
  };
}

export interface JoinFieldMetadata {
  graph: GraphID | undefined;
  requires: string | undefined;
  provides: string | undefined;
  type: string | undefined;
  external: boolean;
  override: GraphName | undefined;
}

export interface JoinTypeMetadata {
  graph: GraphID;
  key: string | undefined;
  extension: boolean;
  resolvable: boolean;
  isInterfaceObject: boolean;
}

export interface JoinImplementsMetadata {
  graph: GraphID;
  interface: string;
}

export interface JoinGraphMetadata {
  name: GraphName;
  url: string | undefined;
}
