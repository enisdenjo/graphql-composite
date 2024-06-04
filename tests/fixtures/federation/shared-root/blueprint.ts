import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      product: Product
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
      implements: [],
      fields: {
        product: {
          name: 'product',
          subgraphs: ['category', 'name', 'price'],
          resolvers: {
            category: {
              subgraph: 'category',
              kind: 'object',
              type: 'String',
              ofType: 'String',
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
              type: 'String',
              ofType: 'String',
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
              type: 'String',
              ofType: 'String',
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
      kind: 'object',
      name: 'Product',
      implements: [],
      fields: {
        id: {
          name: 'id',
          subgraphs: ['category', 'name', 'price'],
          resolvers: {},
        },
        category: {
          name: 'category',
          subgraphs: ['category'],
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['name'],
          resolvers: {},
        },
        price: {
          name: 'price',
          subgraphs: ['price'],
          resolvers: {},
        },
      },
      resolvers: {
        // category: [
        //   {
        //     subgraph: 'category',
        //     kind: 'object',
        //     type: '[Product]!',
        //     ofType: 'Product',
        //     operation: /* GraphQL */ `
        //       query ($id: ID!) {
        //         _entities(
        //           representations: [{ __typename: "Product", id: $id }]
        //         ) {
        //           ... on Product {
        //             ...__export
        //           }
        //         }
        //       }
        //     `,
        //     variables: {
        //       id: {
        //         kind: 'select',
        //         name: 'id',
        //         select: 'id',
        //       },
        //     },
        //   },
        // ],
        // name: [
        //   {
        //     subgraph: 'name',
        //     kind: 'object',
        //     type: '[Product]!',
        //     ofType: 'Product',
        //     operation: /* GraphQL */ `
        //       query ($id: ID!) {
        //         _entities(
        //           representations: [{ __typename: "Product", id: $id }]
        //         ) {
        //           ... on Product {
        //             ...__export
        //           }
        //         }
        //       }
        //     `,
        //     variables: {
        //       id: {
        //         kind: 'select',
        //         name: 'id',
        //         select: 'id',
        //       },
        //     },
        //   },
        // ],
        // price: [
        //   {
        //     subgraph: 'price',
        //     kind: 'object',
        //     type: '[Product]!',
        //     ofType: 'Product',
        //     operation: /* GraphQL */ `
        //       query ($id: ID!) {
        //         _entities(
        //           representations: [{ __typename: "Product", id: $id }]
        //         ) {
        //           ... on Product {
        //             ...__export
        //           }
        //         }
        //       }
        //     `,
        //     variables: {
        //       id: {
        //         kind: 'select',
        //         name: 'id',
        //         select: 'id',
        //       },
        //     },
        //   },
        // ],
      },
    },
  },
};
