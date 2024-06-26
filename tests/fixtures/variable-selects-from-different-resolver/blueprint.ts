import { Blueprint } from '../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      products: [Product!]!
    }

    type Product {
      id: ID!
      upc: String!
      name: String
      price: Float
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      implements: {},
      fields: {
        products: {
          name: 'products',
          subgraphs: ['store'],
          types: {
            store: '[Product!]!',
          },
          resolvers: {
            store: {
              subgraph: 'store',
              kind: 'object',
              type: '[Product!]!',
              ofType: 'Product',
              operation: /* GraphQL */ `
                {
                  products {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
      },
      resolvers: {},
    },
    Product: {
      kind: 'object',
      name: 'Product',
      implements: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['store', 'warehouse', 'finance'],
          types: {
            store: 'ID!',
            warehouse: 'ID!',
            finance: 'ID!',
          },
          resolvers: {},
        },
        upc: {
          name: 'upc',
          subgraphs: ['warehouse', 'finance'],
          types: {
            warehouse: 'String!',
            finance: 'String!',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['store', 'warehouse', 'finance'],
          types: {
            store: 'String',
            warehouse: 'String',
            finance: 'String',
          },
          resolvers: {},
        },
        price: {
          name: 'price',
          subgraphs: ['finance'],
          types: {
            finance: 'Float',
          },
          resolvers: {},
        },
      },
      resolvers: {
        warehouse: [
          {
            kind: 'object',
            subgraph: 'warehouse',
            type: 'Product!',
            ofType: 'Product',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                product(id: $id) {
                  ...__export
                }
              }
            `,
            variables: {
              id: {
                kind: 'select',
                name: 'id',
                select: 'id',
              },
            },
          },
        ],
        finance: [
          {
            kind: 'object',
            subgraph: 'finance',
            type: 'Product!',
            ofType: 'Product',
            operation: /* GraphQL */ `
              query ($id: ID!, $upc: String!) {
                product(id: $id, upc: $upc) {
                  ...__export
                }
              }
            `,
            variables: {
              id: {
                kind: 'select',
                name: 'id',
                select: 'id',
              },
              upc: {
                kind: 'select',
                name: 'upc',
                select: 'upc',
              },
            },
          },
        ],
      },
    },
  },
};
