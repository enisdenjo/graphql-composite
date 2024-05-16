import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { accounts, users } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  a: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@shareable"]
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

          interface Account @key(fields: "id") {
            id: ID!
          }

          type Admin implements Account @key(fields: "id") {
            id: ID!
            isMain: Boolean!
            isActive: Boolean! @shareable
          }

          type Regular implements Account @key(fields: "id") {
            id: ID!
            isMain: Boolean!
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
          Account: {
            __resolveReference(key: { id: string }) {
              const account = accounts.find((account) => account.id === key.id);

              if (!account) {
                return null;
              }

              return {
                __typename: account.__typename,
                id: account.id,
                isActive: account.isActive,
              };
            },
          },
          Admin: {
            __resolveReference(key: { id: string }) {
              const admin = accounts.find((account) => account.id === key.id);

              if (!admin) {
                return null;
              }

              return {
                __typename: admin.__typename,
                id: admin.id,
                isMain: admin.isMain,
                isActive: admin.isActive,
              };
            },
            isMain(admin: { id: string; isMain?: boolean }) {
              if (typeof admin.isMain === 'boolean') {
                return admin.isMain;
              }

              const account = accounts.find((a) => a.id === admin.id);

              if (!account) {
                return null;
              }

              return account.isMain;
            },
          },
          Regular: {
            __resolveReference(key: { id: string }) {
              const admin = accounts.find((account) => account.id === key.id);

              if (!admin) {
                return null;
              }

              return {
                __typename: admin.__typename,
                id: admin.id,
                isMain: admin.isMain,
                isActive: admin.isActive,
              };
            },
            isMain(admin: { id: string; isMain?: boolean }) {
              if (typeof admin.isMain === 'boolean') {
                return admin.isMain;
              }

              const account = accounts.find((a) => a.id === admin.id);

              if (!account) {
                return null;
              }

              return account.isMain;
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
              import: ["@key", "@interfaceObject", "@shareable"]
            )

          type Query {
            anotherUsers: [NodeWithName]
            accounts: [Account] @shareable
          }

          type Account @key(fields: "id") @interfaceObject {
            id: ID!
            name: String!
          }

          type NodeWithName @key(fields: "id") @interfaceObject {
            id: ID!
            username: String
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
                username: node.username,
              };
            },
            username(node: { id: string }) {
              const user = users.find((u) => u.id === node.id);

              if (!user) {
                return null;
              }

              return user.username;
            },
          },
          Account: {
            __resolveReference(key: { __typename: string; id: string }) {
              const account = accounts.find((account) => account.id === key.id);

              if (!account) {
                return null;
              }

              return {
                // I deliberately return a wrong __typename here to make sure it's not used by the gateway
                __typename: 'Never',
                id: account.id,
              };
            },
            name(account: { id: string }) {
              return accounts.find((u) => u.id === account.id)?.name;
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
            accounts() {
              return accounts.map((user) => {
                return {
                  // I deliberately return a wrong __typename here to make sure it's not used by the gateway
                  __typename: 'Never',
                  id: user.id,
                };
              });
            },
          },
        },
      },
    ]),
  ),
  c: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@interfaceObject", "@shareable"]
            )

          type Account @key(fields: "id") @interfaceObject {
            id: ID!
            isActive: Boolean! @shareable
          }
        `),
        resolvers: {
          Account: {
            __resolveReference(key: { __typename: string; id: string }) {
              const account = accounts.find((account) => account.id === key.id);

              if (!account) {
                return null;
              }

              return {
                // I deliberately return a wrong __typename here to make sure it's not used by the gateway
                __typename: 'Never',
                id: account.id,
              };
            },
            isActive() {
              return false;
            },
          },
          Query: {
            accounts() {
              return accounts.map((user) => {
                return {
                  // I deliberately return a wrong __typename here to make sure it's not used by the gateway
                  __typename: 'Never',
                  id: user.id,
                };
              });
            },
          },
        },
      },
    ]),
  ),
};
