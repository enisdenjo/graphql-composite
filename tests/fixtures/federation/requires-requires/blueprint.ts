import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Product {
      id: ID!
      price: Float!
      hasDiscount: Boolean!
      isExpensive: Boolean!
      isExpensiveWithDiscount: Boolean!
      canAfford: Boolean!
      canAffordWithDiscount: Boolean!
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
            b: {
              subgraph: 'b',
              type: 'Product',
            },
          },
          resolvers: {
            b: {
              subgraph: 'b',
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
      },
    },
    Product: {
      kind: 'object',
      name: 'Product',
      fields: {
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
            c: {
              subgraph: 'c',
              type: 'ID!',
            },
            d: {
              subgraph: 'd',
              type: 'ID!',
            },
          },
        },
        price: {
          name: 'price',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Float!',
            },
          },
        },
        hasDiscount: {
          name: 'hasDiscount',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'Boolean!',
            },
          },
        },
        isExpensive: {
          name: 'isExpensive',
          subgraphs: {
            c: {
              subgraph: 'c',
              type: 'Boolean!',
            },
          },
          resolvers: {
            c: {
              subgraph: 'c',
              kind: 'object',
              type: '[Product]!',
              ofType: 'Product',
              operation: /* GraphQL */ `
                query ($id: ID!, $price: Float!) {
                  _entities(
                    representations: [
                      { __typename: "Product", id: $id, price: $price }
                    ]
                  ) {
                    ... on Product {
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
                price: {
                  kind: 'select',
                  name: 'price',
                  select: 'price',
                },
              },
            },
          },
        },
        isExpensiveWithDiscount: {
          name: 'isExpensiveWithDiscount',
          subgraphs: {
            c: {
              subgraph: 'c',
              type: 'Boolean!',
            },
          },
          resolvers: {
            c: {
              subgraph: 'c',
              kind: 'object',
              type: '[Product]!',
              ofType: 'Product',
              operation: /* GraphQL */ `
                query ($id: ID!, $hasDiscount: Boolean!) {
                  _entities(
                    representations: [
                      {
                        __typename: "Product"
                        id: $id
                        hasDiscount: $hasDiscount
                      }
                    ]
                  ) {
                    ... on Product {
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
                hasDiscount: {
                  kind: 'select',
                  name: 'hasDiscount',
                  select: 'hasDiscount',
                },
              },
            },
          },
        },
        canAfford: {
          name: 'canAfford',
          subgraphs: {
            d: {
              subgraph: 'd',
              type: 'Boolean!',
            },
          },
          resolvers: {
            d: {
              subgraph: 'd',
              kind: 'object',
              type: '[Product]!',
              ofType: 'Product',
              operation: /* GraphQL */ `
                query ($id: ID!, $isExpensive: Boolean!) {
                  _entities(
                    representations: [
                      {
                        __typename: "Product"
                        id: $id
                        isExpensive: $isExpensive
                      }
                    ]
                  ) {
                    ... on Product {
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
                isExpensive: {
                  kind: 'select',
                  name: 'isExpensive',
                  select: 'isExpensive',
                },
              },
            },
          },
        },
        canAffordWithDiscount: {
          name: 'canAffordWithDiscount',
          subgraphs: {
            d: {
              subgraph: 'd',
              type: 'Boolean!',
            },
          },
          resolvers: {
            d: {
              subgraph: 'd',
              kind: 'object',
              type: '[Product]!',
              ofType: 'Product',
              operation: /* GraphQL */ `
                query ($id: ID!, $isExpensiveWithDiscount: Boolean!) {
                  _entities(
                    representations: [
                      {
                        __typename: "Product"
                        id: $id
                        isExpensiveWithDiscount: $isExpensiveWithDiscount
                      }
                    ]
                  ) {
                    ... on Product {
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
                isExpensiveWithDiscount: {
                  kind: 'select',
                  name: 'isExpensiveWithDiscount',
                  select: 'isExpensiveWithDiscount',
                },
              },
            },
          },
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'object',
            type: '[Product]!',
            ofType: 'Product',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "Product", id: $id }]
                ) {
                  ... on Product {
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
