import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      users: [User!]!
      accounts: [Account!]!
    }

    type User {
      id: ID
      name: String
      similarAccounts: [Account!]!
    }

    type Admin {
      id: ID
      name: String
      similarAccounts: [Account!]!
    }

    union Account = User | Admin
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
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'object',
              type: '[User!]',
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
        accounts: {
          name: 'accounts',
          subgraphs: ['b'],
          resolvers: {
            b: {
              subgraph: 'b',
              kind: 'object',
              type: '[Account!]',
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
    User: {
      kind: 'object',
      name: 'User',
      implements: {
        Account: {
          name: 'Account',
          subgraphs: ['b'],
        },
      },
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a', 'b'],
          resolvers: {},
        },
        id: {
          name: 'id',
          subgraphs: ['a', 'b'],
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['b'],
          resolvers: {},
        },
        similarAccounts: {
          name: 'similarAccounts',
          subgraphs: ['b'],
          resolvers: {},
        },
      },
      resolvers: {
        b: [
          {
            subgraph: 'b',
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
    Admin: {
      kind: 'object',
      name: 'Admin',
      implements: {
        Account: {
          name: 'Account',
          subgraphs: ['b'],
        },
      },
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['b'],
          resolvers: {},
        },
        id: {
          name: 'id',
          subgraphs: ['b'],
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['b'],
          resolvers: {},
        },
        similarAccounts: {
          name: 'similarAccounts',
          subgraphs: ['b'],
          resolvers: {},
        },
      },
      resolvers: {},
    },
    Account: {
      kind: 'interface',
      name: 'Account',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['b'],
          resolvers: {},
        },
      },
      resolvers: {},
    },
  },
};
