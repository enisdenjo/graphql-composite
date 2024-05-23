import { OperationTypeNode } from 'graphql';
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
  operations: {
    query: {
      name: OperationTypeNode.QUERY,
      fields: {
        users: {
          name: 'users',
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
    },
  },
  types: {
    NodeWithName: {
      kind: 'interface',
      name: 'NodeWithName',
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a', 'b', 'c'],
        },
        name: {
          name: 'name',
          subgraphs: ['a'],
        },
        username: {
          name: 'username',
          subgraphs: ['b'],
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
      implements: ['NodeWithName'],
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a'],
        },
        name: {
          name: 'name',
          subgraphs: ['a'],
        },
        age: {
          name: 'age',
          subgraphs: ['a'],
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
        },
        id: {
          name: 'id',
          subgraphs: ['a', 'b', 'c'],
        },
        name: {
          name: 'name',
          subgraphs: ['b'],
        },
        isActive: {
          name: 'isActive',
          subgraphs: ['c'],
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
      implements: ['Account'],
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a'],
        },
        isMain: {
          name: 'isMain',
          subgraphs: ['a'],
        },
        isActive: {
          name: 'isActive',
          subgraphs: ['a'],
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
