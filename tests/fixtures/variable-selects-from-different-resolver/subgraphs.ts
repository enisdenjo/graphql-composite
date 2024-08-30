import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../utils.js';

const products = [
  {
    id: '1',
    upc: 'h1',
    name: 'Hazelnut',
    price: 10,
  },
  {
    id: '2',
    upc: 's2',
    name: 'Sunflower Seeds',
    price: 14,
  },
];

export const subgraphs: FixtureSubgraphs = {
  store: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        products: [Product!]!
      }

      type Product {
        id: ID!
        name: String
      }
    `,
    resolvers: {
      Query: {
        products() {
          return products;
        },
      },
    },
  }),
  warehouse: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product(id: ID!): Product
      }

      type Product {
        id: ID!
        upc: String!
        name: String
      }
    `,
    resolvers: {
      Query: {
        product(_parent, args: { id: string }) {
          return products.find((p) => p.id === args.id);
        },
      },
    },
  }),
  finance: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product(id: ID!, upc: String!): Product
      }

      type Product {
        id: ID!
        upc: String!
        name: String
        price: Float
      }
    `,
    resolvers: {
      Query: {
        product(_parent, args: { id: string; upc: string }) {
          return products.find((p) => p.id === args.id && p.upc === args.upc);
        },
      },
    },
  }),
};
