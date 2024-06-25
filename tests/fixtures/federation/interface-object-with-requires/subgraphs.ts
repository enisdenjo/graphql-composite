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
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key"]
            )

          type Query {
            users: [NodeWithName!]!
          }

          interface NodeWithName @key(fields: "id") {
            id: ID!
            name: String
          }

          type User implements NodeWithName @key(fields: "id") {
            id: ID!
            name: String
            age: Int
          }
        `),
        resolvers: {
          NodeWithName: {
            __resolveReference(key: { id: string }) {
              const node = users.find((u) => u.id === key.id);

              if (!node) {
                return null;
              }

              return {
                __typename: 'User',
                id: node.id,
                name: node.name,
                age: node.age,
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
                __typename: 'User',
                id: user.id,
                name: user.name,
                age: user.age,
              };
            },
          },
          Query: {
            users() {
              return users.map((u) => ({
                __typename: 'User',
                id: u.id,
                name: u.name,
                age: u.age,
              }));
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
              import: ["@key", "@interfaceObject", "@external", "@requires"]
            )

          type Query {
            anotherUsers: [NodeWithName]
          }

          type NodeWithName @key(fields: "id") @interfaceObject {
            id: ID!
            name: String @external
            username: String @requires(fields: "name")
          }
        `),
        resolvers: {
          NodeWithName: {
            __resolveReference(
              key: { id: string } | { id: string; name: string },
            ) {
              const node = users.find((u) => u.id === key.id);

              if (!node) {
                return null;
              }

              return {
                __typename: 'User',
                id: node.id,
                name: 'name' in key ? key.name : undefined,
              };
            },
            username(node: { id: string; name: string }) {
              const user = users.find((u) => u.id === node.id);

              if (!user) {
                return null;
              }

              if (!node.name) {
                throw new Error("Requires field 'name' not provided");
              }

              return user.username;
            },
          },
          Query: {
            anotherUsers() {
              return users.map((u) => ({
                __typename: 'User',
                id: u.id,
                username: u.username,
              }));
            },
          },
        },
      },
    ]),
  ),
};
