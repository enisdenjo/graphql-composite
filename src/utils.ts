import {
  ASTNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';

export function isRecord(val: unknown): val is Record<string, unknown> {
  return val != null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Creates a GraphQL selection set for dot-notation list of fields.
 * It will expand the fields' dots to nested paths.
 */
export function createSelectionSetForFields(
  fields: string[],
): SelectionSetNode {
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
