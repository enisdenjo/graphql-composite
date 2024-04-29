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
];
