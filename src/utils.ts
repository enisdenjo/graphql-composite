import {
  ASTNode,
  DocumentNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
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

function isOperationDefinitionNode(
  node: ASTNode,
): node is OperationDefinitionNode {
  return node.kind === Kind.OPERATION_DEFINITION;
}
