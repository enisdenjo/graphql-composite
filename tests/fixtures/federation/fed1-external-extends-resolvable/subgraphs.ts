import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { products } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  a: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            productInA: Product
          }

          type Product @key(fields: "id") {
            id: ID!
            name: String
            pid: ID
          }
        `),
        resolvers: {
          Query: {
            productInA() {
              return {
                id: products[0]!.id,
                name: products[0]!.name,
                pid: products[0]!.pid,
              };
            },
          },
          Product: {
            __resolveReference(key: { id: string }) {
              if (products[0]!.id !== key.id) {
                return null;
              }

              return {
                id: products[0]!.id,
                name: products[0]!.name,
                pid: products[0]!.pid,
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
            productInB: Product
          }

          extend type Product @key(fields: "id name") @key(fields: "upc") {
            id: ID @external
            name: String @external
            upc: String @external
            price: Float!
          }
        `),
        resolvers: {
          Query: {
            productInB: () => {
              return {
                id: products[0]!.id,
                name: products[0]!.name,
                upc: products[0]!.upc,
                price: products[0]!.price,
              };
            },
          },
          Product: {
            __resolveReference: (
              key:
                | { id: string; name: string }
                | {
                    upc: string;
                  },
            ) => {
              const product =
                'id' in key
                  ? products.find((p) => p.id === key.id && p.name === key.name)
                  : products.find((p) => p.upc === key.upc);

              return product
                ? {
                    id: product.id,
                    name: product.name,
                    upc: product.upc,
                    price: product.price,
                  }
                : null;
            },
          },
        },
      },
    ]),
  ),
};
