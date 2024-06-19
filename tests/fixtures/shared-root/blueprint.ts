import { Blueprint } from '../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      product: Product
      products: [Product]
    }

    type Product {
      id: ID!
      price: Float
      name: String
      category: String
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      implements: {},
      fields: {
        product: {
          name: 'product',
          subgraphs: ['category', 'name', 'price'],
          types: {
            category: 'Product',
            name: 'Product',
            price: 'Product',
          },
          resolvers: {
            category: {
              subgraph: 'category',
              kind: 'object',
              type: 'Product',
              ofType: 'Product',
              operation: /* GraphQL */ `
                {
                  product {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
            name: {
              subgraph: 'name',
              kind: 'object',
              type: 'Product',
              ofType: 'Product',
              operation: /* GraphQL */ `
                {
                  product {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
            price: {
              subgraph: 'price',
              kind: 'object',
              type: 'Product',
              ofType: 'Product',
              operation: /* GraphQL */ `
                {
                  product {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        products: {
          name: 'products',
          subgraphs: ['category', 'name', 'price'],
          types: {
            category: 'Product',
            name: 'Product',
            price: 'Product',
          },
          resolvers: {
            category: {
              subgraph: 'category',
              kind: 'object',
              type: '[Product]',
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
            name: {
              subgraph: 'name',
              kind: 'object',
              type: '[Product]',
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
            price: {
              subgraph: 'price',
              kind: 'object',
              type: '[Product]',
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
          subgraphs: ['category', 'name', 'price'],
          types: {
            category: 'Product',
            name: 'Product',
            price: 'Product',
          },
          resolvers: {},
        },
        category: {
          name: 'category',
          subgraphs: ['category'],
          types: {
            category: 'Product',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['name'],
          types: {
            name: 'Product',
          },
          resolvers: {},
        },
        price: {
          name: 'price',
          subgraphs: ['price'],
          types: {
            price: 'Product',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
  },
};
