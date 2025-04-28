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
      fields: {
        product: {
          name: 'product',
          subgraphs: {
            category: {
              subgraph: 'category',
              type: 'Product',
            },
            name: {
              subgraph: 'name',
              type: 'Product',
            },
            price: {
              subgraph: 'price',
              type: 'Product',
            },
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
          subgraphs: {
            category: {
              subgraph: 'category',
              type: 'Product',
            },
            name: {
              subgraph: 'category',
              type: 'Product',
            },
            price: {
              subgraph: 'category',
              type: 'Product',
            },
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
    },
    Product: {
      kind: 'object',
      name: 'Product',
      fields: {
        id: {
          name: 'id',
          subgraphs: {
            category: {
              subgraph: 'category',
              type: 'Product',
            },
            name: {
              subgraph: 'name',
              type: 'Product',
            },
            price: {
              subgraph: 'price',
              type: 'Product',
            },
          },
        },
        category: {
          name: 'category',
          subgraphs: {
            category: {
              subgraph: 'category',
              type: 'Product',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            name: {
              subgraph: 'name',
              type: 'Product',
            },
          },
        },
        price: {
          name: 'price',
          subgraphs: {
            price: {
              subgraph: 'price',
              type: 'Product',
            },
          },
        },
      },
    },
  },
};
