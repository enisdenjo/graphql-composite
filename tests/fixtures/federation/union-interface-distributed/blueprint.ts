import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      products: [Product]
      node(id: ID!): Node
      nodes: [Node]
      toasters: [Toaster]
    }

    union Product = Oven | Toaster

    interface Node {
      id: ID!
    }

    type Oven implements Node {
      id: ID!
      warranty: Int
    }

    type Toaster implements Node {
      id: ID!
      warranty: Int
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      implements: {},
      fields: {
        products: {
          name: 'products',
          subgraphs: ['a'],
          types: {
            a: '[Product]',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: '[Product]',
              ofType: 'Product',
              operation: /* GraphQL */ `
                {
                  products {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        toasters: {
          name: 'toasters',
          subgraphs: ['a'],
          types: {
            a: '[Toaster]',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'object',
              type: '[Toaster]',
              ofType: 'Toaster',
              operation: /* GraphQL */ `
                {
                  toasters {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        nodes: {
          name: 'nodes',
          subgraphs: ['a'],
          types: {
            a: '[Node]',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: '[Node]',
              ofType: 'Node',
              operation: /* GraphQL */ `
                {
                  nodes {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        node: {
          name: 'node',
          subgraphs: ['a'],
          types: {
            a: 'Node',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: 'Node',
              ofType: 'Node',
              operation: /* GraphQL */ `
                query ($id: ID!) {
                  node(id: $id) {
                    ...__export
                  }
                }
              `,
              variables: {
                id: {
                  kind: 'user',
                  name: 'id',
                },
              },
            },
          },
        },
      },
      resolvers: {},
    },
    Node: {
      kind: 'interface',
      name: 'Node',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a'],
          types: {
            a: 'String!',
          },
          resolvers: {},
        },
        id: {
          name: 'id',
          subgraphs: ['a', 'b'],
          types: {
            a: 'ID!',
            b: 'ID!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
    Product: {
      kind: 'interface',
      name: 'Product',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a'],
          types: {
            a: 'String!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
    Toaster: {
      kind: 'object',
      name: 'Toaster',
      implements: {
        Node: {
          name: 'Node',
          subgraphs: ['a'],
        },
        Product: {
          name: 'Product',
          subgraphs: ['a'],
        },
      },
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a'],
          types: {
            a: 'String!',
          },
          resolvers: {},
        },
        id: {
          name: 'id',
          subgraphs: ['a'],
          types: {
            a: 'ID!',
          },
          resolvers: {},
        },
        warranty: {
          name: 'warranty',
          subgraphs: ['a'],
          types: {
            a: 'Int',
          },
          resolvers: {},
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'object',
            type: '[Toaster]!',
            ofType: 'Toaster',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "Toaster", id: $id }]
                ) {
                  ... on Toaster {
                    ...__export
                  }
                }
              }
            `,
            variables: {
              id: {
                kind: 'select',
                name: 'id',
                select: 'id',
              },
            },
          },
        ],
      },
    },
    Oven: {
      kind: 'object',
      name: 'Oven',
      implements: {
        Node: {
          name: 'Node',
          subgraphs: ['b'],
        },
        Product: {
          name: 'Product',
          subgraphs: ['a'],
        },
      },
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a', 'b'],
          types: {
            a: 'String!',
            b: 'String!',
          },
          resolvers: {},
        },
        id: {
          name: 'id',
          subgraphs: ['a', 'b'],
          types: {
            a: 'ID!',
            b: 'ID!',
          },
          resolvers: {},
        },
        warranty: {
          name: 'warranty',
          subgraphs: ['b'],
          types: {
            b: 'Int',
          },
          resolvers: {},
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'object',
            type: '[Oven]!',
            ofType: 'Oven',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(representations: [{ __typename: "Oven", id: $id }]) {
                  ... on Oven {
                    ...__export
                  }
                }
              }
            `,
            variables: {
              id: {
                kind: 'select',
                name: 'id',
                select: 'id',
              },
            },
          },
        ],
        b: [
          {
            subgraph: 'b',
            kind: 'object',
            type: '[Oven]!',
            ofType: 'Oven',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(representations: [{ __typename: "Oven", id: $id }]) {
                  ... on Oven {
                    ...__export
                  }
                }
              }
            `,
            variables: {
              id: {
                kind: 'select',
                name: 'id',
                select: 'id',
              },
            },
          },
        ],
      },
    },
  },
};
