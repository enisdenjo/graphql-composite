import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { users } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  age: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@inaccessible", "@shareable"]
            )

          type Query {
            usersInAge: [User!]! @shareable
          }

          type User @key(fields: "id") {
            id: ID
            age: Int
          }
        `),
        resolvers: {
          Query: {
            usersInAge() {
              return users.map((u) => ({
                id: u.id,
                age: u.age,
              }));
            },
          },
          User: {
            __resolveReference(key: { id: string }) {
              const user = users.find((u) => u.id === key.id);

              if (!user) {
                return null;
              }

              return {
                id: user.id,
                age: user.age,
              };
            },
          },
        },
      },
    ]),
  ),
  friends: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@inaccessible", "@shareable"]
            )

          type Query {
            usersInFriends: [User!]!
          }

          type User @key(fields: "id") {
            id: ID
            friends(type: FriendType = FAMILY @inaccessible): [User!]!
            type: FriendType
          }

          enum FriendType {
            FAMILY @inaccessible
            FRIEND
          }
        `),
        resolvers: {
          Query: {
            usersInFriends() {
              return users.map((u) => ({
                id: u.id,
                friends: u.friends,
              }));
            },
          },
          User: {
            __resolveReference(key: { id: string }) {
              const user = users.find((u) => u.id === key.id);

              if (!user) {
                return null;
              }

              return {
                id: user.id,
                friends: user.friends,
              };
            },
            friends(user: { id: string; friends: string[] }) {
              return user.friends.map((id) => {
                const friend = users.find((u) => u.id === id);

                if (!friend) {
                  return null;
                }

                return {
                  id: friend.id,
                  friends: friend.friends,
                };
              });
            },
            type() {
              return 'FAMILY';
            },
          },
        },
      },
    ]),
  ),
};
