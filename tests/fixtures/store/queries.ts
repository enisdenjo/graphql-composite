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
  },
  {
    name: 'ScalarOperationFieldNested',
    document: parse(/* GraphQL */ `
      query ScalarOperationFieldNested {
        productName(upc: "ipad")
      }
    `),
    variables: {},
  },
  {
    name: 'BasicWithInlineFragment',
    document: parse(/* GraphQL */ `
      query NotBasicWithInlineVariables {
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
    variables: {
      id: 'apple-store',
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
  },
];
