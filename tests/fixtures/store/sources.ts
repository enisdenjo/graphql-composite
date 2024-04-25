import { createSource, FixtureSources } from '../../utils.js';

export const sources: FixtureSources = {
  storefronts: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        storefront(id: ID!): Storefront
      }
      type Storefront {
        id: ID!
        name: String!
        products: [Product]!
      }
      type Product {
        upc: ID!
      }
    `,
    resolvers: {
      Query: {
        storefront: () => ({
          id: 'cyberport',
          name: 'CyberPort',
          products: [
            {
              upc: 'laptop',
            },
            {
              upc: 'computer',
            },
            {
              upc: 'headset',
            },
          ],
        }),
      },
    },
  }),
  products: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product(upc: ID!): Product
      }
      type Product {
        upc: ID!
        name: String!
        price: Float!
        manufacturer: Manufacturer
      }
      type Manufacturer {
        id: ID!
        products: [Product]!
      }
    `,
    resolvers: {
      Query: {
        product: (_parent, args: { upc: string }) => ({
          upc: args.upc,
          name: `TODO: name of product ${args.upc}`,
          price: `TODO: price of product ${args.upc}`,
          manufacturer: {
            id: `manufacturer-of-${args.upc}`,
            products: [
              {
                upc: args.upc,
                name: `TODO: name of product ${args.upc}`,
                price: `TODO: price of product ${args.upc}`,
              },
              {
                upc: 'otherthing',
                name: 'TODO: name of product otherthing',
                price: 'TODO: price of product otherthing',
              },
            ],
          },
        }),
      },
    },
  }),
  manufacturers: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        manufacturer(id: ID!): Manufacturer
      }
      type Manufacturer {
        id: ID!
        name: String!
      }
    `,
    resolvers: {
      Query: {
        manufacturer: (_parent, args: { id: string }) => ({
          id: args.id,
          name: `TODO: name of manufacturer ${args.id}`,
        }),
      },
    },
  }),
};
