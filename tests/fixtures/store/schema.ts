import { OperationTypeNode } from 'graphql';
import { SchemaPlan } from '../../../src/schemaPlan.js';

export const schema: SchemaPlan = {
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
  operations: {
    query: {
      name: OperationTypeNode.QUERY,
      fields: {
        manufacturer: {
          name: 'manufacturer',
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
          resolvers: {
            manufacturers: {
              subgraph: 'manufacturers',
              kind: 'scalar',
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
          resolvers: {
            products: {
              subgraph: 'products',
              kind: 'scalar',
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
          resolvers: {
            products: {
              subgraph: 'products',
              kind: 'scalar',
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
    },
  },
  interfaces: {},
  objects: {
    Manufacturer: {
      name: 'Manufacturer',
      implements: [],
      fields: {
        id: {
          name: 'id',
          subgraphs: ['manufacturers', 'products'],
        },
        name: {
          name: 'name',
          subgraphs: ['manufacturers'],
        },
        products: {
          name: 'products',
          subgraphs: ['products'],
        },
      },
      resolvers: {
        manufacturers: {
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
        products: {
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
      },
    },
    Product: {
      name: 'Product',
      implements: [],
      fields: {
        manufacturer: {
          name: 'manufacturer',
          subgraphs: ['products'],
        },
        name: {
          name: 'name',
          subgraphs: ['products'],
        },
        price: {
          name: 'price',
          subgraphs: ['products'],
        },
        upc: {
          name: 'upc',
          subgraphs: ['products', 'storefronts'],
        },
      },
      resolvers: {
        products: {
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
        storefronts: {
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
      },
    },
    Storefront: {
      name: 'Storefront',
      implements: [],
      fields: {
        id: {
          name: 'id',
          subgraphs: ['storefronts'],
        },
        name: {
          name: 'name',
          subgraphs: ['storefronts'],
        },
        products: {
          name: 'products',
          subgraphs: ['storefronts'],
        },
        productNames: {
          name: 'productNames',
          subgraphs: ['storefronts'],
        },
      },
      resolvers: {
        storefronts: {
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
      },
    },
  },
};
