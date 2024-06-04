import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { product } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  category: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@shareable"]
            )

          type Query {
            product: Product @shareable
            products: [Product] @shareable
          }

          type Product { # @key(fields: "id") {
            id: ID!
            category: String
          }
        `),
        resolvers: {
          Query: {
            product() {
              return {
                id: product.id,
                category: product.category,
              };
            },
            products() {
              return [
                {
                  id: product.id,
                  category: product.category,
                },
              ];
            },
          },
          // Product: {
          //   __resolveReference() {
          //     throw new Error('Query.product was supposed to be used instead');
          //   },
          // },
        },
      },
    ]),
  ),
  name: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@shareable"]
            )

          type Query {
            product: Product @shareable
            products: [Product] @shareable
          }

          type Product { # @key(fields: "id") {
            id: ID!
            name: String
          }
        `),
        resolvers: {
          Query: {
            product() {
              return {
                id: product.id,
                name: product.name,
              };
            },
            products() {
              return [
                {
                  id: product.id,
                  name: product.name,
                },
              ];
            },
          },
          // Product: {
          //   __resolveReference() {
          //     throw new Error('Query.product was supposed to be used instead');
          //   },
          // },
        },
      },
    ]),
  ),
  price: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@shareable"]
            )

          type Query {
            product: Product @shareable
            products: [Product] @shareable
          }

          type Product { # @key(fields: "id") {
            id: ID!
            price: Float
          }
        `),
        resolvers: {
          Query: {
            product() {
              return {
                id: product.id,
                price: product.price,
              };
            },
            products() {
              return [
                {
                  id: product.id,
                  price: product.price,
                },
              ];
            },
          },
          // Product: {
          //   __resolveReference() {
          //     throw new Error('Query.product was supposed to be used instead');
          //   },
          // },
        },
      },
    ]),
  ),
};
