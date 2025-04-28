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
      fields: {
        products: {
          name: 'products',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: '[Product]',
            },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: '[Toaster]',
            },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: '[Node]',
            },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Node',
            },
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
    },
    Node: {
      kind: 'interface',
      name: 'Node',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
          },
        },
        id: {
          name: 'id',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ID!',
            },
            b: {
              subgraph: 'b',
              type: 'ID!',
            },
          },
        },
      },
    },
    Product: {
      kind: 'interface',
      name: 'Product',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
          },
        },
      },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
          },
        },
        id: {
          name: 'id',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ID!',
            },
          },
        },
        warranty: {
          name: 'warranty',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Int',
            },
          },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
        id: {
          name: 'id',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ID!',
            },
            b: {
              subgraph: 'b',
              type: 'ID!',
            },
          },
        },
        warranty: {
          name: 'warranty',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'Int',
            },
          },
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
