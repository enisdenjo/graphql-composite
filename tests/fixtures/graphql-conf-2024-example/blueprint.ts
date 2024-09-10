import { Blueprint } from '../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      store(id: ID!): Store
    }

    type Store {
      id: ID!
      name: String!
      products: [Product]!
    }

    type Product {
      id: ID!
      name: String!
      price: Float!
      manufacturer: Manufacturer!
    }

    type Manufacturer {
      id: ID!
      name: String!
      products: [Product]!
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      implements: {},
      fields: {
        store: {
          name: 'store',
          subgraphs: ['stores'],
          types: {
            stores: 'Store',
          },
          resolvers: {
            stores: {
              subgraph: 'stores',
              kind: 'object',
              type: 'Store',
              ofType: 'Store',
              operation: /* GraphQL */ `
                query ($id: ID!) {
                  store(id: $id) {
                    ...__export
                  }
                }
              `,
              variables: {
                id: {
                  kind: 'user',
                  name: 'id',
                },
              },
            },
          },
        },
      },
      resolvers: {},
    },
    Store: {
      kind: 'object',
      name: 'Store',
      implements: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['stores'],
          types: {
            stores: 'ID!',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['stores'],
          types: {
            stores: 'String!',
          },
          resolvers: {},
        },
        products: {
          name: 'products',
          subgraphs: ['stores'],
          types: {
            stores: '[Product]!',
          },
          resolvers: {},
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
          subgraphs: ['products', 'stores'],
          types: {
            products: 'ID!',
            stores: 'ID!',
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
        manufacturer: {
          name: 'manufacturer',
          subgraphs: ['products'],
          types: {
            products: 'Manufacturer',
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
              query ($Product_id: ID!) {
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
    Manufacturer: {
      kind: 'object',
      name: 'Manufacturer',
      implements: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['manufacturers', 'products'],
          types: {
            manufacturers: 'ID!',
            products: 'ID!',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['manufacturers'],
          types: {
            manufacturers: 'String!',
          },
          resolvers: {},
        },
        products: {
          name: 'products',
          subgraphs: ['products'],
          types: {
            products: '[Product]!',
          },
          resolvers: {},
        },
      },
      resolvers: {
        manufacturers: [
          {
            subgraph: 'manufacturers',
            kind: 'object',
            type: 'Manufacturer',
            ofType: 'Manufacturer',
            operation: /* GraphQL */ `
              query ($Manufacturer_id: ID!) {
                manufacturer(id: $Manufacturer_id) {
                  ...__export
                }
              }
            `,
            variables: {
              Manufacturer_id: {
                kind: 'select',
                name: 'Manufacturer_id',
                select: 'id',
              },
            },
          },
        ],
      },
    },
  },
};
