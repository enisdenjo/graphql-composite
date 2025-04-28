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
      fields: {
        products: {
          name: 'products',
          subgraphs: {
            store: {
              subgraph: 'store',
              type: '[Product!]!',
            },
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
    },
    Product: {
      kind: 'object',
      name: 'Product',
      fields: {
        id: {
          name: 'id',
          subgraphs: {
            store: {
              subgraph: 'store',
              type: 'ID!',
            },
            warehouse: {
              subgraph: 'warehouse',
              type: 'ID!',
            },
            finance: {
              subgraph: 'finance',
              type: 'ID!',
            },
          },
        },
        upc: {
          name: 'upc',
          subgraphs: {
            warehouse: {
              subgraph: 'warehouse',
              type: 'String!',
            },
            finance: {
              subgraph: 'finance',
              type: 'String!',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            store: {
              subgraph: 'store',
              type: 'String',
            },
            warehouse: {
              subgraph: 'warehouse',
              type: 'String',
            },
            finance: {
              subgraph: 'finance',
              type: 'String',
            },
          },
        },
        price: {
          name: 'price',
          subgraphs: {
            finance: {
              subgraph: 'finance',
              type: 'Float',
            },
          },
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
