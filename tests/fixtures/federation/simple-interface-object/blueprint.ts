import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    interface Account {
      id: ID!
      name: String!
      isActive: Boolean!
    }

    type Admin implements Account {
      id: ID!
      isMain: Boolean!
      isActive: Boolean!
      name: String!
    }

    interface NodeWithName {
      id: ID!
      name: String
      username: String
    }

    type Query {
      users: [NodeWithName!]!
      anotherUsers: [NodeWithName]
      accounts: [Account]
    }

    type Regular implements Account {
      id: ID!
      isMain: Boolean!
      name: String!
      isActive: Boolean!
    }

    type User implements NodeWithName {
      id: ID!
      name: String
      age: Int
      username: String
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      implements: {},
      fields: {
        users: {
          name: 'users',
          subgraphs: ['a'],
          types: {
            a: '[NodeWithName!]!',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: '[NodeWithName!]!',
              ofType: 'NodeWithName',
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
        anotherUsers: {
          name: 'anotherUsers',
          subgraphs: ['b'],
          types: {
            b: '[NodeWithName!]!',
          },
          resolvers: {
            b: {
              subgraph: 'b',
              kind: 'interface',
              type: '[NodeWithName!]!',
              ofType: 'NodeWithName',
              operation: /* GraphQL */ `
                {
                  anotherUsers {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        accounts: {
          name: 'accounts',
          subgraphs: ['b'],
          types: {
            b: '[Account]',
          },
          resolvers: {
            b: {
              subgraph: 'b',
              kind: 'interface',
              type: '[Account]',
              ofType: 'Account',
              operation: /* GraphQL */ `
                {
                  accounts {
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
    NodeWithName: {
      kind: 'interface',
      name: 'NodeWithName',
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a', 'b', 'c'],
          types: {
            a: 'ID!',
            b: 'ID!',
            c: 'ID!',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['a'],
          types: {
            a: 'String',
          },
          resolvers: {},
        },
        username: {
          name: 'username',
          subgraphs: ['b'],
          types: {
            b: 'String',
          },
          resolvers: {},
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'interface',
            type: '[NodeWithName]!',
            ofType: 'NodeWithName',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "NodeWithName", id: $id }]
                ) {
                  ... on NodeWithName {
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
            type: '[NodeWithName]!',
            ofType: 'NodeWithName',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "NodeWithName", id: $id }]
                ) {
                  ... on NodeWithName {
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
    User: {
      kind: 'object',
      name: 'User',
      implements: {
        NodeWithName: {
          name: 'NodeWithName',
          subgraphs: ['a', 'b'], // it's not implementing it really in B, we "fake" it as it's @interfaceObject
        },
      },
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a'],
          types: {
            a: 'ID!',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['a'],
          types: {
            a: 'String',
          },
          resolvers: {},
        },
        age: {
          name: 'age',
          subgraphs: ['a'],
          types: {
            a: 'Int',
          },
          resolvers: {},
        },
        // there is no username field on "b", but the NodeWithName implements it
        // username: {
        //   name: 'username',
        //   subgraphs: ['b'],
        // },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'object',
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
    Account: {
      kind: 'interface',
      name: 'Account',
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
          subgraphs: ['a', 'b', 'c'],
          types: {
            a: 'ID!',
            b: 'ID!',
            c: 'ID!',
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
        isActive: {
          name: 'isActive',
          subgraphs: ['c'],
          types: {
            c: 'Boolean!',
          },
          resolvers: {},
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'interface',
            type: '[Account]!',
            ofType: 'Account',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "Account", id: $id }]
                ) {
                  ... on Account {
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
            type: '[Account]!',
            ofType: 'Account',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "Account", id: $id }]
                ) {
                  ... on Account {
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
        c: [
          {
            subgraph: 'c',
            kind: 'interface',
            type: '[Account]!',
            ofType: 'Account',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "Account", id: $id }]
                ) {
                  ... on Account {
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
    Admin: {
      kind: 'object',
      name: 'Admin',
      implements: {
        Account: {
          name: 'Account',
          subgraphs: ['a', 'b', 'c'], // it's not implementing it really in B and C, we "fake" it as it's @interfaceObject
        },
      },
      fields: {
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
        isActive: {
          name: 'isActive',
          subgraphs: ['a'],
          types: {
            a: 'Boolean!',
          },
          resolvers: {},
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
    },
  },
};
