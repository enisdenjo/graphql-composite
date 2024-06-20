import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';

const users = [
  {
    id: 'u1',
    name: 'u1-name',
  },
];

function accounts() {
  return [
    ...users.map((user) => ({ __typename: 'User', ...user })),
    { __typename: 'Admin', id: 'a1', name: 'a1-name' },
  ];
}

export const subgraphs: FixtureSubgraphs = {
  a: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key"]
            )

          type User @key(fields: "id", resolvable: false) {
            id: ID
          }

          type Query {
            users: [User!]!
          }
        `),
        resolvers: {
          Query: {
            users() {
              return users.map((u) => ({ __typename: 'User', id: u.id }));
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
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key"]
            )

          union Account = User | Admin

          type User @key(fields: "id") {
            id: ID!
            name: String
            similarAccounts: [Account!]!
          }

          type Admin {
            id: ID
            name: String
            similarAccounts: [Account!]!
          }

          type Query {
            accounts: [Account!]!
          }
        `),
        resolvers: {
          Query: {
            accounts,
          },
          User: {
            __resolveReference(key: { id: string }) {
              return users.find((user) => user.id === key.id);
            },
            similarAccounts: accounts,
          },
          Admin: {
            similarAccounts: accounts,
          },
        },
      },
    ]),
  ),
};
