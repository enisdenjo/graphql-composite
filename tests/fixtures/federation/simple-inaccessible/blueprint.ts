import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      usersInAge: [User!]!
      usersInFriends: [User!]!
    }

    type User {
      id: ID
      age: Int
      friends: [User!]!
      type: FriendType
    }

    enum FriendType {
      # FAMILY @inaccessible
      FRIEND
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
          resolvers: {},
        },
        age: {
          name: 'age',
          subgraphs: ['age'],
          resolvers: {},
        },
        friends: {
          name: 'friends',
          subgraphs: ['friends'],
          resolvers: {},
        },
        type: {
          name: 'type',
          subgraphs: ['friends'],
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
