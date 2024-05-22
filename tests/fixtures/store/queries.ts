import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'ScalarOperationField',
    document: parse(/* GraphQL */ `
      query ScalarOperationField {
        manufacturerName(id: "samsung")
      }
    `),
    variables: {},
    result: {
      data: {
        manufacturerName: 'Samsung',
      },
    },
  },
  {
    name: 'ScalarOperationFieldNested',
    document: parse(/* GraphQL */ `
      query ScalarOperationFieldNested {
        productName(upc: "ipad")
      }
    `),
    variables: {},
    result: {
      data: {
        productName: 'iPad',
      },
    },
  },
  {
    name: 'BasicWithInlineFragment',
    document: parse(/* GraphQL */ `
      query BasicWithInlineFragment {
        storefront(id: "samsung-store") {
          id
          name
          products {
            ... on Product {
              upc
              name
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        storefront: {
          id: 'samsung-store',
          name: 'Samsung',
          products: [
            {
              name: 'Samsung TV',
              upc: 'tv',
            },
            {
              name: 'Samsung Fold',
              upc: 'fold',
            },
            {
              name: 'Samsung Galaxy',
              upc: 'galaxy',
            },
          ],
        },
      },
    },
  },
  {
    name: 'BasicWithFragmentDefinition',
    document: parse(/* GraphQL */ `
      query BasicWithFragmentDefinition {
        storefront(id: "apple-store") {
          id
          products {
            ...P
          }
          name
        }
      }
      fragment P on Product {
        upc
        manufacturer {
          id
        }
      }
    `),
    variables: {},
    result: {
      data: {
        storefront: {
          id: 'apple-store',
          name: 'Apple Store',
          products: [
            {
              manufacturer: {
                id: 'apple',
              },
              upc: 'iphone',
            },
            {
              manufacturer: {
                id: 'apple',
              },
              upc: 'ipad',
            },
          ],
        },
      },
    },
  },
  {
    name: 'NotBasicWithInlineVariables',
    document: parse(/* GraphQL */ `
      query NotBasicWithInlineVariables {
        storefront(id: "samsung-store") {
          id
          name
          products {
            upc
            name
            manufacturer {
              products {
                upc
                name
              }
              name
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        storefront: {
          id: 'samsung-store',
          name: 'Samsung',
          products: [
            {
              manufacturer: {
                name: 'Samsung',
                products: [
                  {
                    name: 'Samsung TV',
                    upc: 'tv',
                  },
                  {
                    name: 'Samsung Fold',
                    upc: 'fold',
                  },
                  {
                    name: 'Samsung Galaxy',
                    upc: 'galaxy',
                  },
                ],
              },
              name: 'Samsung TV',
              upc: 'tv',
            },
            {
              manufacturer: {
                name: 'Samsung',
                products: [
                  {
                    name: 'Samsung TV',
                    upc: 'tv',
                  },
                  {
                    name: 'Samsung Fold',
                    upc: 'fold',
                  },
                  {
                    name: 'Samsung Galaxy',
                    upc: 'galaxy',
                  },
                ],
              },
              name: 'Samsung Fold',
              upc: 'fold',
            },
            {
              manufacturer: {
                name: 'Samsung',
                products: [
                  {
                    name: 'Samsung TV',
                    upc: 'tv',
                  },
                  {
                    name: 'Samsung Fold',
                    upc: 'fold',
                  },
                  {
                    name: 'Samsung Galaxy',
                    upc: 'galaxy',
                  },
                ],
              },
              name: 'Samsung Galaxy',
              upc: 'galaxy',
            },
          ],
        },
      },
    },
  },
  {
    name: 'NotBasicWithOperationVariables',
    document: parse(/* GraphQL */ `
      query NotBasicWithOperationVariables($id: ID!) {
        storefront(id: $id) {
          id
          name
          products {
            upc
            name
            manufacturer {
              products {
                upc
                name
              }
              name
            }
          }
        }
      }
    `),
    variables: {
      id: 'apple-store',
    },
    result: {
      data: {
        storefront: {
          id: 'apple-store',
          name: 'Apple Store',
          products: [
            {
              manufacturer: {
                name: 'Apple',
                products: [
                  {
                    name: 'Apple iPhone',
                    upc: 'iphone',
                  },
                  {
                    name: 'iPad',
                    upc: 'ipad',
                  },
                ],
              },
              name: 'Apple iPhone',
              upc: 'iphone',
            },
            {
              manufacturer: {
                name: 'Apple',
                products: [
                  {
                    name: 'Apple iPhone',
                    upc: 'iphone',
                  },
                  {
                    name: 'iPad',
                    upc: 'ipad',
                  },
                ],
              },
              name: 'iPad',
              upc: 'ipad',
            },
          ],
        },
      },
    },
  },
  {
    name: 'ListOperationResolver',
    document: parse(/* GraphQL */ `
      query ListOperationResolver {
        productsByUpcs(upcs: ["galaxy", "iphone"]) {
          upc
          name
          manufacturer {
            products {
              upc
              name
            }
            name
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        productsByUpcs: [
          {
            manufacturer: {
              name: 'Samsung',
              products: [
                {
                  name: 'Samsung TV',
                  upc: 'tv',
                },
                {
                  name: 'Samsung Fold',
                  upc: 'fold',
                },
                {
                  name: 'Samsung Galaxy',
                  upc: 'galaxy',
                },
              ],
            },
            name: 'Samsung Galaxy',
            upc: 'galaxy',
          },
          {
            manufacturer: {
              name: 'Apple',
              products: [
                {
                  name: 'Apple iPhone',
                  upc: 'iphone',
                },
                {
                  name: 'iPad',
                  upc: 'ipad',
                },
              ],
            },
            name: 'Apple iPhone',
            upc: 'iphone',
          },
        ],
      },
    },
  },
  {
    name: 'ScalarListInType',
    document: parse(/* GraphQL */ `
      query ScalarListInType {
        storefront(id: "apple-store") {
          productNames
        }
      }
    `),
    variables: {},
    result: {
      data: {
        storefront: {
          productNames: ['Apple iPhone', 'iPad'],
        },
      },
    },
  },
  {
    name: 'ScalarListInOperation',
    document: parse(/* GraphQL */ `
      query ScalarListInOperation {
        productNames
      }
    `),
    variables: {},
    result: {
      data: {
        productNames: [
          'Samsung TV',
          'Samsung Fold',
          'Samsung Galaxy',
          'Apple iPhone',
          'iPad',
        ],
      },
    },
  },
];
