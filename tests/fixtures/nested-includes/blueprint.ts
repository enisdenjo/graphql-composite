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
      implements: {},
      fields: {
        allProducts: {
          name: 'allProducts',
          subgraphs: ['products'],
          types: {
            products: '[Product!]!',
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
      resolvers: {},
    },
    Product: {
      kind: 'object',
      name: 'Product',
      implements: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['products', 'users', 'reviews'],
          types: {
            products: 'ID!',
            users: 'ID!',
            reviews: 'ID!',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['products'],
          types: {
            products: 'String!',
          },
          resolvers: {},
        },
        price: {
          name: 'price',
          subgraphs: ['products'],
          types: {
            products: 'Float!',
          },
          resolvers: {},
        },
        reviews: {
          name: 'reviews',
          subgraphs: ['reviews'],
          types: {
            reviews: '[Review!]!',
          },
          resolvers: {},
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
      implements: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['users', 'reviews'],
          types: {
            users: 'ID!',
            reviews: 'ID!',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['users'],
          types: {
            users: 'String!',
          },
          resolvers: {},
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
      implements: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['reviews'],
          types: {
            reviews: 'ID!',
          },
          resolvers: {},
        },
        rating: {
          name: 'rating',
          subgraphs: ['reviews'],
          types: {
            reviews: 'Int!',
          },
          resolvers: {},
        },
        user: {
          name: 'user',
          subgraphs: ['reviews'],
          types: {
            reviews: 'User!',
          },
          resolvers: {},
        },
        product: {
          name: 'product',
          subgraphs: ['reviews'],
          types: {
            reviews: 'Product!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
  },
};
