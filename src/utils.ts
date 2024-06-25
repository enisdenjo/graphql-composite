import {
  ASTNode,
  ASTVisitor,
  DirectiveDefinitionNode,
  DocumentNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  getEnterLeaveForKind,
  InputValueDefinitionNode,
  Kind,
  NamedTypeNode,
  OperationDefinitionNode,
  parseType,
  SelectionNode,
  TypeDefinitionNode,
  TypeExtensionNode,
  TypeNode,
} from 'graphql';

export function isRecord(val: unknown): val is Record<string, unknown> {
  return val != null && typeof val === 'object' && !Array.isArray(val);
}

export function assert(condition: any, msg: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

/**
 * Returns the named type node of a type node.
 */
export function readBaseTypeNode(node: TypeNode): NamedTypeNode {
  if (node.kind === Kind.NON_NULL_TYPE || node.kind === Kind.LIST_TYPE) {
    return readBaseTypeNode(node.type);
  }

  return node;
}

/**
 * Given a type node or print(type node), returns the name of the base type.
 * Remove all type modifiers like NonNull and List.
 */
export function readBaseTypeName(node: TypeNode | string): string {
  return typeof node === 'string'
    ? node.replace(/!/g, '').replace(/\[|\]/g, '')
    : readBaseTypeNode(node).name.value;
}

/**
 * Asserts that a node is of a certain kind.
 * Helpful for type narrowing.
 * Throws an error if the node is not of the expected kind.
 */
export function assertNode<K extends Kind>(
  node:
    | {
        kind: Kind;
      }
    | undefined,
  kind: K,
): asserts node is Extract<ASTNode, { kind: K }> {
  if (node?.kind !== kind) {
    throw new Error(`Expected ${kind} but got ${node?.kind}`);
  }
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

function isNode(maybeNode: any): maybeNode is ASTNode {
  const maybeKind = maybeNode?.kind;
  return typeof maybeKind === 'string';
}

/**
 * Similar to TypeInfo from graphql-js, but holds only the current and parent AST nodes.
 */
export class TypeNodeInfo {
  private _type:
    | TypeDefinitionNode
    | TypeExtensionNode
    | DirectiveDefinitionNode
    | undefined;
  private _field: FieldDefinitionNode | InputValueDefinitionNode | undefined;
  private _arg: InputValueDefinitionNode | undefined;
  private _value: EnumValueDefinitionNode | undefined;

  constructor() {
    this._type = undefined;
    this._field = undefined;
    this._arg = undefined;
    this._value = undefined;
  }

  get [Symbol.toStringTag]() {
    return 'TypeNodeInfo';
  }

  /**
   * Returns the current type definition node.
   * In case of a field, it returns the parent type definition node.
   * You get the point...
   */
  getTypeDef() {
    return this._type;
  }

  /**
   * Returns the current field or input value definition node.
   */
  getFieldDef() {
    return this._field;
  }

  /**
   * Returns the current argument definition node.
   */
  getArgumentDef() {
    return this._arg;
  }

  /**
   * Returns the current enum value definition node.
   */
  getValueDef() {
    return this._value;
  }

  enter(node: ASTNode) {
    switch (node.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.OBJECT_TYPE_EXTENSION:
      case Kind.INTERFACE_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_EXTENSION:
      case Kind.UNION_TYPE_DEFINITION:
      case Kind.UNION_TYPE_EXTENSION:
      case Kind.ENUM_TYPE_DEFINITION:
      case Kind.ENUM_TYPE_EXTENSION:
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      case Kind.INPUT_OBJECT_TYPE_EXTENSION:
      case Kind.SCALAR_TYPE_DEFINITION:
      case Kind.SCALAR_TYPE_EXTENSION:
      case Kind.DIRECTIVE_DEFINITION:
        this._type = node;
        break;

      case Kind.ENUM_VALUE_DEFINITION:
        this._value = node;
        break;

      case Kind.FIELD_DEFINITION:
        this._field = node;
        break;

      case Kind.INPUT_VALUE_DEFINITION:
        if (this._field) {
          this._arg = node;
        } else {
          this._field = node;
        }
        break;
      default:

      // Ignore other nodes
    }
  }

  leave(node: ASTNode) {
    switch (node.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.OBJECT_TYPE_EXTENSION:
      case Kind.INTERFACE_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_EXTENSION:
      case Kind.UNION_TYPE_DEFINITION:
      case Kind.UNION_TYPE_EXTENSION:
      case Kind.ENUM_TYPE_DEFINITION:
      case Kind.ENUM_TYPE_EXTENSION:
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      case Kind.INPUT_OBJECT_TYPE_EXTENSION:
      case Kind.SCALAR_TYPE_DEFINITION:
      case Kind.SCALAR_TYPE_EXTENSION:
      case Kind.DIRECTIVE_DEFINITION:
        this._type = undefined;
        break;

      case Kind.FIELD_DEFINITION:
        this._field = undefined;
        break;

      case Kind.ENUM_VALUE_DEFINITION:
        this._value = undefined;
        break;

      case Kind.INPUT_VALUE_DEFINITION:
        if (this._arg) {
          this._arg = undefined;
        } else {
          this._field = undefined;
        }
        break;

      default:
      // Ignore other nodes
    }
  }
}

/**
 * Creates a new visitor instance which maintains a provided TypeNodeInfo instance
 * along with visiting visitor.
 */
export function visitWithTypeNodeInfo(
  typeInfo: TypeNodeInfo,
  visitor: ASTVisitor,
): ASTVisitor {
  return {
    enter(
      node: ASTNode,
      key: string | number | undefined,
      parent: ASTNode | ReadonlyArray<ASTNode> | undefined,
      path: ReadonlyArray<string | number>,
      ancestors: ReadonlyArray<ASTNode | ReadonlyArray<ASTNode>>,
    ) {
      typeInfo.enter(node);
      const fn = getEnterLeaveForKind(visitor, node.kind).enter;
      if (fn) {
        const result = fn.call(visitor, node, key, parent, path, ancestors);
        if (result !== undefined) {
          typeInfo.leave(node);
          if (isNode(result)) {
            typeInfo.enter(result);
          }
        }
        return result;
      }
    },
    leave(
      node: ASTNode,
      key: string | number | undefined,
      parent: ASTNode | ReadonlyArray<ASTNode> | undefined,
      path: ReadonlyArray<string | number>,
      ancestors: ReadonlyArray<ASTNode | ReadonlyArray<ASTNode>>,
    ) {
      const fn = getEnterLeaveForKind(visitor, node.kind).leave;
      let result;
      if (fn) {
        result = fn.call(visitor, node, key, parent, path, ancestors);
      }
      typeInfo.leave(node);
      return result;
    },
  };
}
