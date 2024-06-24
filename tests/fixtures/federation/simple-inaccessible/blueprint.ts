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
      implements: {},
      fields: {
        usersInAge: {
          name: 'usersInAge',
          subgraphs: ['age'],
          types: {
            age: '[User!]!',
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
          subgraphs: ['friends'],
          types: {
            friends: '[User!]!',
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
      resolvers: {},
    },
    User: {
      name: 'User',
      kind: 'object',
      implements: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['age', 'friends'],
          types: {
            age: 'ID',
            friends: 'ID',
          },
          resolvers: {},
        },
        age: {
          name: 'age',
          subgraphs: ['age'],
          types: {
            age: 'Int',
          },
          resolvers: {},
        },
        friends: {
          name: 'friends',
          subgraphs: ['friends'],
          types: {
            friends: '[User!]!',
          },
          resolvers: {},
        },
        type: {
          name: 'type',
          subgraphs: ['friends'],
          types: {
            friends: 'FriendType',
          },
          resolvers: {},
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
