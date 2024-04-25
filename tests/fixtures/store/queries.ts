import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'NotBasic',
    document: parse(/* GraphQL */ `
      query NotBasic {
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
    variables: { id: '2' }, // TODO: inline variables support
  },
];
