import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Book implements Product {
      id: ID!
      samePriceProduct: Book
      price: Float
    }

    interface Product {
      samePriceProduct: Product
    }

    type Query {
      product: Product
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
            a: {
              subgraph: 'a',
              type: 'Product',
            },
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
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
      },
    },
    Product: {
      kind: 'interface',
      name: 'Product',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
          },
        },
        samePriceProduct: {
          name: 'samePriceProduct',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Product',
            },
          },
        },
      },
    },
    Book: {
      kind: 'object',
      name: 'Book',
      implements: {
        Product: {
          name: 'Product',
          subgraphs: ['a'],
        },
      },
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
        id: {
          name: 'id',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ID!',
            },
            b: {
              subgraph: 'b',
              type: 'ID!',
            },
          },
        },
        samePriceProduct: {
          name: 'samePriceProduct',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Book',
              provides: ['price'],
            },
          },
        },
        price: {
          name: 'price',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'Float',
            },
          },
        },
      },
      resolvers: {
        b: [
          {
            subgraph: 'b',
            kind: 'object',
            type: '[Book]!',
            ofType: 'Book',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(representations: [{ __typename: "Book", id: $id }]) {
                  ... on Book {
                    ...__export
                  }
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
      },
    },
  },
};
