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
      fields: {
        users: {
          name: 'users',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: '[NodeWithName!]!',
            },
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
          subgraphs: {
            b: {
              subgraph: 'b',
              type: '[NodeWithName!]!',
            },
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
          subgraphs: {
            b: {
              subgraph: 'b',
              type: '[Account]',
            },
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
    },
    NodeWithName: {
      kind: 'interface',
      name: 'NodeWithName',
      fields: {
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
            c: {
              subgraph: 'c',
              type: 'ID!',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String',
            },
          },
        },
        username: {
          name: 'username',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String',
            },
          },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ID!',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String',
            },
          },
        },
        age: {
          name: 'age',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Int',
            },
          },
        },
        // there is no username field on "b", but the NodeWithName implements it
        // username: {
        //   name: 'username',
        //   subgraphs: { b: { subgraph: 'b', type: 'String' } },
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
            c: {
              subgraph: 'c',
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
        isActive: {
          name: 'isActive',
          subgraphs: {
            c: {
              subgraph: 'c',
              type: 'Boolean!',
            },
          },
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
        isActive: {
          name: 'isActive',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Boolean!',
            },
          },
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
