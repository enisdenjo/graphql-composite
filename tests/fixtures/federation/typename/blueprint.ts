import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      union: Product
      interface: Node
      users: [User]
    }

    type Oven implements Node {
      id: ID!
    }

    type Admin implements User {
      id: ID!
      isMain: Boolean!
      name: String!
    }

    interface Node {
      id: ID!
    }

    union Product = Oven | Toaster

    type Toaster implements Node {
      id: ID!
    }

    interface User {
      id: ID!
      name: String!
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      fields: {
        union: {
          name: 'union',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Product',
            },
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: 'Product',
              ofType: 'Product',
              operation: /* GraphQL */ `
                {
                  union {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        interface: {
          name: 'interface',
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
                {
                  interface {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        users: {
          name: 'users',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: '[User]',
            },
          },
          resolvers: {
            b: {
              subgraph: 'b',
              kind: 'interface',
              type: '[User]',
              ofType: 'User',
              operation: /* GraphQL */ `
                {
                  users {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
      },
    },
    Oven: {
      kind: 'object',
      name: 'Oven',
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
              type: 'ID!',
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
      },
    },
    Admin: {
      kind: 'object',
      name: 'Admin',
      implements: {
        User: {
          name: 'User',
          subgraphs: [
            'a',
            'b', // it's not implementing it really in B, we "fake" it as it's @interfaceObject
          ],
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'object',
            type: '[Admin]!',
            ofType: 'Admin',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(representations: [{ __typename: "Admin", id: $id }]) {
                  ... on Admin {
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
        isMain: {
          name: 'isMain',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Boolean!',
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
          },
        },
      },
    },
    User: {
      kind: 'interface',
      name: 'User',
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
        name: {
          name: 'name',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'interface',
            type: '[User]!',
            ofType: 'User',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(representations: [{ __typename: "User", id: $id }]) {
                  ... on User {
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
            kind: 'interface',
            type: '[User]!',
            ofType: 'User',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(representations: [{ __typename: "User", id: $id }]) {
                  ... on User {
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
  },
};
