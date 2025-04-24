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
      implements: {},
      fields: {
        product: {
          name: 'product',
          subgraphs: ['a'],
          types: {
            a: 'Product',
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
      resolvers: {},
    },
    Product: {
      kind: 'interface',
      name: 'Product',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a'],
          types: {
            a: 'String!',
          },
          resolvers: {},
        },
        samePriceProduct: {
          name: 'samePriceProduct',
          subgraphs: ['a'],
          types: {
            a: 'Product',
          },
          resolvers: {},
        },
      },
      resolvers: {},
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
          subgraphs: ['a', 'b'],
          types: {
            a: 'String!',
            b: 'String!',
          },
          resolvers: {},
        },
        id: {
          name: 'id',
          subgraphs: ['a', 'b'],
          types: {
            a: 'ID!',
            b: 'ID!',
          },
          resolvers: {},
        },
        samePriceProduct: {
          name: 'samePriceProduct',
          subgraphs: ['a'],
          types: {
            a: 'Book',
          },
          resolvers: {},
        },
        price: {
          name: 'price',
          subgraphs: ['b'],
          types: {
            b: 'Float',
          },
          resolvers: {},
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
