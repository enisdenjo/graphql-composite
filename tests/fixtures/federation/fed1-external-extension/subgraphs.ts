import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { users } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  a: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            randomUser: User
          }

          extend type User @key(fields: "id") {
            id: ID! @external
            rid: ID
          }
        `),
        resolvers: {
          Query: {
            randomUser() {
              return {
                id: users[0]!.id,
                rid: users[0]!.rid,
              };
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
                rid: user.rid,
              };
            },
          },
        },
      },
    ]),
  ),
  b: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            userById(id: ID): User
          }

          type User @key(fields: "id") {
            id: ID!
            name: String!
            nickname: String
          }
        `),
        resolvers: {
          Query: {
            userById: (_: {}, { id }: { id: string }) => {
              const user = users.find((u) => u.id === id);

              if (!user) {
                return null;
              }

              return {
                id: user.id,
                name: user.name,
                nickname: user.nickname,
              };
            },
          },
          User: {
            __resolveReference: (key: { id: string }) => {
              const user = users.find((u) => u.id === key.id);

              if (!user) {
                return null;
              }

              return {
                id: user.id,
                name: user.name,
                nickname: user.nickname,
              };
            },
          },
        },
      },
    ]),
  ),
};
