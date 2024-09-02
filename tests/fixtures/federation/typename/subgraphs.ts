import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';

const users = [
  {
    __typename: 'Admin',
    id: 'u1',
    name: 'Alice',
    isMain: false,
  },
  {
    __typename: 'Admin',
    id: 'u2',
    name: 'Bob',
    isMain: true,
  },
];

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
            union: Product
            interface: Node
          }

          union Product = Oven | Toaster

          interface Node {
            id: ID!
          }

          type Oven implements Node {
            id: ID!
          }

          type Toaster implements Node {
            id: ID!
          }

          interface User @key(fields: "id") {
            id: ID!
          }

          type Admin implements User @key(fields: "id") {
            id: ID!
            isMain: Boolean!
          }
        `),
        resolvers: {
          Query: {
            union() {
              return { id: '1', __typename: 'Oven' };
            },
            interface() {
              return { id: '2', __typename: 'Toaster' };
            },
          },
          User: {
            __resolveReference(key: { id: string }) {
              const user = users.find((user) => user.id === key.id);

              if (!user) {
                return null;
              }

              return {
                __typename: user.__typename,
                id: user.id,
              };
            },
          },
          Admin: {
            __resolveReference(key: { id: string }) {
              const user = users.find((user) => user.id === key.id);

              if (!user) {
                return null;
              }

              return {
                __typename: user.__typename,
                id: user.id,
                isMain: user.isMain,
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
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@interfaceObject"]
            )

          type Query {
            users: [User]
          }

          type User @key(fields: "id") @interfaceObject {
            id: ID!
            name: String!
          }
        `),
        resolvers: {
          Query: {
            users() {
              return users.map((user) => {
                return {
                  // I deliberately return no __typename as it should not be resolved by the @interfaceObject
                  id: user.id,
                };
              });
            },
          },
          User: {
            __resolveReference(key: { id: string }) {
              const user = users.find((user) => user.id === key.id);

              if (!user) {
                return null;
              }

              return {
                // I deliberately return no __typename as it should not be resolved by the @interfaceObject
                id: user.id,
              };
            },
            name(user: { id: string }) {
              return users.find((u) => u.id === user.id)?.name;
            },
          },
        },
      },
    ]),
  ),
};
