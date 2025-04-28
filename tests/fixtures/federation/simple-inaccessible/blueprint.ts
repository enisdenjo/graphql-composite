import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    enum FriendType {
      # FAMILY @inaccessible
      FRIEND
    }

    type Query {
      usersInAge: [User!]!
      usersInFriends: [User!]!
    }

    type User {
      id: ID
      age: Int
      friends: [User!]! # argument (type: FriendType = FAMILY) is @inaccessible
      type: FriendType
    }
  `,
  types: {
    Query: {
      name: 'Query',
      kind: 'object',
      fields: {
        usersInAge: {
          name: 'usersInAge',
          subgraphs: {
            age: {
              subgraph: 'age',
              type: '[User!]!',
            },
          },
          resolvers: {
            age: {
              subgraph: 'age',
              kind: 'object',
              type: '[User!]!',
              ofType: 'User',
              operation: /* GraphQL */ `
                {
                  usersInAge {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        usersInFriends: {
          name: 'usersInFriends',
          subgraphs: {
            friends: {
              subgraph: 'friends',
              type: '[User!]!',
            },
          },
          resolvers: {
            friends: {
              subgraph: 'friends',
              kind: 'object',
              type: '[User!]!',
              ofType: 'User',
              operation: /* GraphQL */ `
                {
                  usersInFriends {
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
      name: 'User',
      kind: 'object',
      fields: {
        id: {
          name: 'id',
          subgraphs: {
            age: {
              subgraph: 'age',
              type: 'ID',
            },
            friends: {
              subgraph: 'friends',
              type: 'ID',
            },
          },
        },
        age: {
          name: 'age',
          subgraphs: {
            age: {
              subgraph: 'age',
              type: 'Int',
            },
          },
        },
        friends: {
          name: 'friends',
          subgraphs: {
            friends: {
              subgraph: 'friends',
              type: '[User!]!',
            },
          },
        },
        type: {
          name: 'type',
          subgraphs: {
            friends: {
              subgraph: 'friends',
              type: 'FriendType',
            },
          },
        },
      },
      resolvers: {
        age: [
          {
            subgraph: 'age',
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
        friends: [
          {
            subgraph: 'friends',
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
  },
};
