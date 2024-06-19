import { Blueprint } from '../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Manufacturer {
      id: ID!
      name: String!
      products: [Product]!
    }

    type Query {
      manufacturer(id: ID!): Manufacturer
      manufacturerName(id: ID!): String
      product(upc: ID!): Product
      productsByUpcs(upcs: [ID!]!): [Product]!
      productName(upc: ID!): String
      productNames: [String!]!
      storefront(id: ID!): Storefront
    }

    type Product {
      manufacturer: Manufacturer
      name: String!
      price: Float!
      upc: ID!
    }

    type Storefront {
      id: ID!
      name: String!
      products: [Product]!
      productNames: [String!]!
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      implements: {},
      fields: {
        manufacturer: {
          name: 'manufacturer',
          subgraphs: ['manufacturers'],
          types: {
            manufacturers: 'Manufacturer',
          },
          resolvers: {
            manufacturers: {
              subgraph: 'manufacturers',
              kind: 'object',
              type: 'Manufacturer',
              ofType: 'Manufacturer',
              operation: /* GraphQL */ `
                query manufacturer($id: ID!) {
                  manufacturer(id: $id) {
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
        manufacturerName: {
          name: 'manufacturerName',
          subgraphs: ['manufacturers'],
          types: {
            manufacturers: 'String',
          },
          resolvers: {
            manufacturers: {
              subgraph: 'manufacturers',
              kind: 'primitive',
              type: 'String',
              ofType: 'String',
              operation: /* GraphQL */ `
                query manufacturerName($id: ID!) {
                  manufacturerName(id: $id)
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
        product: {
          name: 'product',
          subgraphs: ['products'],
          types: {
            products: 'Product',
          },
          resolvers: {
            products: {
              subgraph: 'products',
              kind: 'object',
              type: 'Product',
              ofType: 'Product',
              operation: /* GraphQL */ `
                query product($upc: ID!) {
                  product(upc: $upc) {
                    ...__export
                  }
                }
              `,
              variables: {
                upc: {
                  kind: 'user',
                  name: 'upc',
                },
              },
            },
          },
        },
        productsByUpcs: {
          name: 'productsByUpcs',
          subgraphs: ['products'],
          types: {
            products: '[Product]!',
          },
          resolvers: {
            products: {
              subgraph: 'products',
              kind: 'object',
              type: '[Product]!',
              ofType: 'Product',
              operation: /* GraphQL */ `
                query productsByUpcs($upcs: [ID!]!) {
                  productsByUpcs(upcs: $upcs) {
                    ...__export
                  }
                }
              `,
              variables: {
                upcs: {
                  kind: 'user',
                  name: 'upcs',
                },
              },
            },
          },
        },
        productName: {
          name: 'productName',
          subgraphs: ['products'],
          types: {
            products: 'String',
          },
          resolvers: {
            products: {
              subgraph: 'products',
              kind: 'primitive',
              type: 'String',
              ofType: 'String',
              operation: /* GraphQL */ `
                query productName($upc: ID!) {
                  product(upc: $upc) {
                    name
                  }
                }
              `,
              variables: {
                upc: {
                  kind: 'user',
                  name: 'upc',
                },
              },
            },
          },
        },
        productNames: {
          name: 'productNames',
          subgraphs: ['products'],
          types: {
            products: '[String!]!',
          },
          resolvers: {
            products: {
              subgraph: 'products',
              kind: 'primitive',
              type: '[String!]!',
              ofType: 'String',
              operation: /* GraphQL */ `
                query productNames {
                  productNames
                }
              `,
              variables: {},
            },
          },
        },
        storefront: {
          name: 'storefront',
          subgraphs: ['storefronts'],
          types: {
            storefronts: 'Storefront',
          },
          resolvers: {
            storefronts: {
              subgraph: 'storefronts',
              kind: 'object',
              type: 'Storefront',
              ofType: 'Storefront',
              operation: /* GraphQL */ `
                query storefront($id: ID!) {
                  storefront(id: $id) {
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
              query ManufacturerById($Manufacturer_id: ID!) {
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
        products: [
          {
            subgraph: 'products',
            kind: 'object',
            type: 'Manufacturer',
            ofType: 'Manufacturer',
            operation: /* GraphQL */ `
              query ManufacturerById($Manufacturer_id: ID!) {
                _manufacturer(id: $Manufacturer_id) {
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
    Product: {
      kind: 'object',
      name: 'Product',
      implements: {},
      fields: {
        manufacturer: {
          name: 'manufacturer',
          subgraphs: ['products'],
          types: {
            products: 'Manufacturer',
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
        upc: {
          name: 'upc',
          subgraphs: ['products', 'storefronts'],
          types: {
            products: 'ID!',
            storefronts: 'ID!',
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
              query ProductByUpc($Product_upc: ID!) {
                product(upc: $Product_upc) {
                  ...__export
                }
              }
            `,
            variables: {
              Product_upc: {
                kind: 'select',
                name: 'Product_upc',
                select: 'upc',
              },
            },
          },
        ],
        storefronts: [
          {
            subgraph: 'storefronts',
            kind: 'object',
            type: 'Product',
            ofType: 'Product',
            operation: /* GraphQL */ `
              query ProductByUpc($Product_upc: ID!) {
                product(upc: $Product_upc) {
                  ...__export
                }
              }
            `,
            variables: {
              Product_upc: {
                kind: 'select',
                name: 'Product_upc',
                select: 'upc',
              },
            },
          },
        ],
      },
    },
    Storefront: {
      kind: 'object',
      name: 'Storefront',
      implements: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['storefronts'],
          types: {
            storefronts: 'ID!',
          },
          resolvers: {},
        },
        name: {
          name: 'name',
          subgraphs: ['storefronts'],
          types: {
            storefronts: 'String!',
          },
          resolvers: {},
        },
        products: {
          name: 'products',
          subgraphs: ['storefronts'],
          types: {
            storefronts: '[Product]!',
          },
          resolvers: {},
        },
        productNames: {
          name: 'productNames',
          subgraphs: ['storefronts'],
          types: {
            storefronts: '[String!]!',
          },
          resolvers: {},
        },
      },
      resolvers: {
        storefronts: [
          {
            subgraph: 'storefronts',
            kind: 'object',
            type: 'Storefront',
            ofType: 'Storefront',
            operation: /* GraphQL */ `
              query StorefrontById($Storefront_id: ID!) {
                storefront(id: $Storefront_id) {
                  ...__export
                }
              }
            `,
            variables: {
              Storefront_id: {
                kind: 'select',
                name: 'Storefront_id',
                select: 'id',
              },
            },
          },
        ],
      },
    },
  },
};
