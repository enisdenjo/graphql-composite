import {
  ASTNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  parseType,
  SelectionNode,
} from 'graphql';

export function isRecord(val: unknown): val is Record<string, unknown> {
  return val != null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Flattens fragment definitions to inline fragments of the query.
 * Making sure the gather planning can just use the `Field` visitor and
 * get proper order for the plan.
 *
 * We intentionally dont flatten fragments into just fields because
 * of interfaces/unions support.
 */
export function flattenFragments(doc: DocumentNode): DocumentNode {
  function flattenSelectionNodeIntoSelections(
    node: SelectionNode,
    dest: SelectionNode[],
  ) {
    switch (node.kind) {
      case Kind.FIELD:
      case Kind.INLINE_FRAGMENT: {
        // we leave inline fragments as is because their types are important to interfaces/unions
        const selections: SelectionNode[] = [];
        dest.push({
          ...node,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections,
          },
        });
        for (const sel of node.selectionSet?.selections || []) {
          flattenSelectionNodeIntoSelections(sel, selections);
        }
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const frag = doc.definitions.find(
          (d) =>
            d.kind === Kind.FRAGMENT_DEFINITION &&
            d.name.value === node.name.value,
        ) as FragmentDefinitionNode | undefined;
        if (!frag) {
          throw new Error(
            `Fragment definition for "${node.name.value}" not found`,
          );
        }
        // we convert a fragment definition to an inline fragment to retain the type information
        const selections: SelectionNode[] = [];
        dest.push({
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: frag.typeCondition,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections,
          },
        });
        for (const sel of frag.selectionSet.selections) {
          flattenSelectionNodeIntoSelections(sel, selections);
        }
        break;
      }
    }
  }

  const definitions: OperationDefinitionNode[] = [];
  for (const def of doc.definitions.filter(isOperationDefinitionNode)) {
    const selections: SelectionNode[] = [];
    definitions.push({
      ...def,
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections,
      },
    });
    for (const sel of def.selectionSet.selections) {
      flattenSelectionNodeIntoSelections(sel, selections);
    }
  }
  return {
    kind: Kind.DOCUMENT,
    definitions,
  };
}

export function isField(node: ASTNode): node is FieldNode {
  return node.kind === Kind.FIELD;
}

function isOperationDefinitionNode(
  node: ASTNode,
): node is OperationDefinitionNode {
  return node.kind === Kind.OPERATION_DEFINITION;
}

/** Parses a GraphQL type string (ex. `[Int!]`) and checks whether it's a list. */
export function isListType(str: string): boolean {
  let t = parseType(str);
  while (t.kind === Kind.NON_NULL_TYPE) {
    t = t.type;
  }
  return t.kind === Kind.LIST_TYPE;
}
