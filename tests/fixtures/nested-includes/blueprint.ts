import { Blueprint } from '../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      allProducts: [Product!]!
    }

    type Product {
      id: ID!
      name: String!
      price: Float!
      reviews: [Review!]!
    }

    type User {
      id: ID!
      name: String!
      orders: [Order!]!
    }

    enum OrderStatus {
      pending
      delivered
    }

    type Order {
      id: ID!
      status: OrderStatus!
      user: User!
      products: [Product!]!
    }

    type Review {
      id: ID!
      rating: Int!
      user: User!
      product: Product!
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      fields: {
        allProducts: {
          name: 'allProducts',
          subgraphs: {
            products: {
              subgraph: 'products',
              type: '[Product!]!',
            },
          },
          resolvers: {
            products: {
              subgraph: 'products',
              kind: 'object',
              type: '[Product!]!',
              ofType: 'Product',
              operation: /* GraphQL */ `
                query allProducts {
                  allProducts {
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
            products: {
              subgraph: 'products',
              type: 'ID!',
            },
            users: {
              subgraph: 'users',
              type: 'ID!',
            },
            reviews: {
              subgraph: 'reviews',
              type: 'ID!',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            products: {
              subgraph: 'products',
              type: 'String!',
            },
          },
        },
        price: {
          name: 'price',
          subgraphs: {
            products: {
              subgraph: 'products',
              type: 'Float!',
            },
          },
        },
        reviews: {
          name: 'reviews',
          subgraphs: {
            reviews: {
              subgraph: 'reviews',
              type: '[Review!]!',
            },
          },
        },
      },
      resolvers: {
        products: [
          {
            subgraph: 'products',
            kind: 'object',
            type: 'Product',
            ofType: 'Product',
            operation: /* GraphQL */ `
              query ProductByID($Product_id: ID!) {
                product(id: $Product_id) {
                  ...__export
                }
              }
            `,
            variables: {
              Product_id: {
                kind: 'select',
                name: 'Product_id',
                select: 'id',
              },
            },
          },
        ],
        reviews: [
          {
            subgraph: 'reviews',
            kind: 'object',
            type: 'Product',
            ofType: 'Product',
            operation: /* GraphQL */ `
              query ProductByID($Product_id: ID!) {
                product(id: $Product_id) {
                  ...__export
                }
              }
            `,
            variables: {
              Product_id: {
                kind: 'select',
                name: 'Product_id',
                select: 'id',
              },
            },
          },
        ],
      },
    },
    User: {
      kind: 'object',
      name: 'User',
      fields: {
        id: {
          name: 'id',
          subgraphs: {
            users: {
              subgraph: 'usersa',
              type: 'ID!',
            },
            reviews: {
              subgraph: 'reviews',
              type: 'ID!',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            users: {
              subgraph: 'users',
              type: 'String!',
            },
          },
        },
      },
      resolvers: {
        users: [
          {
            subgraph: 'users',
            kind: 'object',
            type: 'User',
            ofType: 'User',
            operation: /* GraphQL */ `
              query UserByID($User_id: ID!) {
                user(id: $User_id) {
                  ...__export
                }
              }
            `,
            variables: {
              User_id: {
                kind: 'select',
                name: 'User_id',
                select: 'id',
              },
            },
          },
        ],
      },
    },
    Review: {
      kind: 'object',
      name: 'Review',
      fields: {
        id: {
          name: 'id',
          subgraphs: {
            reviews: {
              subgraph: 'reviews',
              type: 'ID!',
            },
          },
        },
        rating: {
          name: 'rating',
          subgraphs: {
            reviews: {
              subgraph: 'reviews',
              type: 'Int!',
            },
          },
        },
        user: {
          name: 'user',
          subgraphs: {
            reviews: {
              subgraph: 'reviews',
              type: 'User!',
            },
          },
        },
        product: {
          name: 'product',
          subgraphs: {
            reviews: {
              subgraph: 'reviews',
              type: 'Product!',
            },
          },
        },
      },
    },
  },
};
