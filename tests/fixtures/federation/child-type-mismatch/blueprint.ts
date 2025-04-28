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
      fields: {
        users: {
          name: 'users',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: '[User!]',
            },
          },
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
          subgraphs: {
            b: {
              subgraph: 'b',
              type: '[Account!]',
            },
          },
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
              type: 'ID',
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
              type: 'String',
            },
          },
        },
        similarAccounts: {
          name: 'similarAccounts',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: '[Account!]!',
            },
          },
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
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
        id: {
          name: 'id',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'ID',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String',
            },
          },
        },
        similarAccounts: {
          name: 'similarAccounts',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: '[Account!]!',
            },
          },
        },
      },
    },
    Account: {
      kind: 'interface',
      name: 'Account',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
      },
    },
  },
};
