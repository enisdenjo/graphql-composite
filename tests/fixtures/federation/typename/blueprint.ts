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
      implements: {},
      fields: {
        union: {
          name: 'union',
          subgraphs: ['a'],
          types: {
            a: 'Product',
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
          subgraphs: ['b'],
          types: {
            b: '[User]',
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
      resolvers: {},
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
      resolvers: {},
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
      resolvers: {},
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a'],
          types: {
            a: 'ID!',
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
        isMain: {
          name: 'isMain',
          subgraphs: ['a'],
          types: {
            a: 'Boolean!',
          },
          resolvers: {},
        },
      },
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
          subgraphs: ['a'],
          types: {
            a: 'ID!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
    User: {
      kind: 'interface',
      name: 'User',
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
        name: {
          name: 'name',
          subgraphs: ['b'],
          types: {
            b: 'String!',
          },
          resolvers: {},
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
      resolvers: {},
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
    },
  },
};
