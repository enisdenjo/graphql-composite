import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError, parse } from 'graphql';
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
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@inaccessible"]
            )

          type Product @key(fields: "id") {
            id: ID!
            price: Float! @inaccessible
          }
        `),
        resolvers: {
          Product: {
            __resolveReference(key: { id: string }) {
              const product = products.find((product) => product.id === key.id);

              if (!product) {
                return null;
              }

              return {
                id: product.id,
                price: product.price,
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
              import: ["@key"]
            )

          type Query {
            product: Product
          }

          type Product @key(fields: "id") {
            id: ID!
            hasDiscount: Boolean!
          }
        `),
        resolvers: {
          Query: {
            product() {
              return {
                id: products[0]!.id,
                hasDiscount: products[0]!.hasDiscount,
              };
            },
          },
          Product: {
            __resolveReference(key: { id: string }) {
              const product = products.find((product) => product.id === key.id);

              if (!product) {
                return null;
              }

              return {
                id: product.id,
                hasDiscount: product.hasDiscount,
              };
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
              import: ["@key", "@external", "@requires"]
            )

          type Product @key(fields: "id") {
            id: ID!
            price: Float! @external
            isExpensive: Boolean! @requires(fields: "price")
            hasDiscount: Boolean! @external
            isExpensiveWithDiscount: Boolean! @requires(fields: "hasDiscount")
          }
        `),
        resolvers: {
          Product: {
            __resolveReference(key: {
              id: string;
              price?: number;
              hasDiscount?: boolean;
            }) {
              if (!products.find((product) => product.id === key.id)) {
                return null;
              }

              const product: {
                __typename: 'Product';
                id: string;
                price?: number;
                isExpensive?: boolean;
                hasDiscount?: boolean;
                isExpensiveWithDiscount?: boolean;
              } = {
                __typename: 'Product',
                id: key.id,
              };

              if (typeof key.price === 'number') {
                product.price = key.price;
                product.isExpensive = key.price > 500;
              } else if ('price' in key && typeof key.price !== 'undefined') {
                return new GraphQLError('Product.price must be a number');
              }

              if (typeof key.hasDiscount === 'boolean') {
                product.hasDiscount = key.hasDiscount;
                product.isExpensiveWithDiscount = !key.hasDiscount;
              } else if (
                'hasDiscount' in key &&
                typeof key.hasDiscount !== 'undefined'
              ) {
                return new GraphQLError('Product.hasDiscount must be a number');
              }

              return product;
            },
          },
        },
      },
    ]),
  ),
  d: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@external", "@requires"]
            )

          type Product @key(fields: "id") {
            id: ID!
            isExpensive: Boolean! @external
            canAfford: Boolean! @requires(fields: "isExpensive")
            isExpensiveWithDiscount: Boolean! @external
            canAffordWithDiscount: Boolean!
              @requires(fields: "isExpensiveWithDiscount")
          }
        `),
        resolvers: {
          Product: {
            __resolveReference(key: {
              id: string;
              isExpensive?: boolean;
              isExpensiveWithDiscount?: boolean;
            }) {
              if (!products.find((product) => product.id === key.id)) {
                return null;
              }

              const product: {
                __typename: 'Product';
                id: string;
                isExpensive?: boolean;
                canAfford?: boolean;
                isExpensiveWithDiscount?: boolean;
                canAffordWithDiscount?: boolean;
              } = {
                __typename: 'Product',
                id: key.id,
              };

              if (typeof key.isExpensive === 'boolean') {
                product.isExpensive = key.isExpensive;
                product.canAfford = !key.isExpensive;
              } else if (
                'isExpensive' in key &&
                typeof key.isExpensive !== 'undefined'
              ) {
                return new GraphQLError(
                  'Product.isExpensive must be a boolean',
                );
              }

              if (typeof key.isExpensiveWithDiscount === 'boolean') {
                product.isExpensiveWithDiscount = key.isExpensiveWithDiscount;
                product.canAffordWithDiscount = !key.isExpensiveWithDiscount;
              } else if (
                'isExpensiveWithDiscount' in key &&
                typeof key.isExpensiveWithDiscount !== 'undefined'
              ) {
                return new GraphQLError(
                  'Product.isExpensiveWithDiscount must be a boolean',
                );
              }

              return product;
            },
          },
        },
      },
    ]),
  ),
};
