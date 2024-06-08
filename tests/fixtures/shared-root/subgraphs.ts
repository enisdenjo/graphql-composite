import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../utils.js';
import { product } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  category: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product: Product
        products: [Product]
      }

      type Product {
        id: ID!
        category: String
      }
    `,
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
    },
  }),
  name: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product: Product
        products: [Product]
      }

      type Product {
        id: ID!
        name: String
      }
    `,
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
    },
  }),
  price: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product: Product
        products: [Product]
      }

      type Product {
        id: ID!
        price: Float
      }
    `,
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
    },
  }),
};
