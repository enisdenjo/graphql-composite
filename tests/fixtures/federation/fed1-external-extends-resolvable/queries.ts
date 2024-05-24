import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'test',
    document: parse(/* GraphQL */ `
      query test {
        productInA {
          id
          pid
          price
          upc
          name
        }
      }
    `),
    variables: {},
    result: {
      data: {
        productInA: {
          id: 'p1',
          pid: 'p1-pid',
          price: 12.3,
          upc: 'upc1',
          name: 'p1-name',
        },
      },
    },
  },
];
