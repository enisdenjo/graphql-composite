import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'NotBasicWithInlineVariables',
    document: parse(/* GraphQL */ `
      query NotBasicWithInlineVariables {
        storefront(id: "2") {
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
];
