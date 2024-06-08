import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'SharedRoot',
    document: parse(/* GraphQL */ `
      query SharedRoot {
        product {
          id
          name
          category
          price
        }
      }
    `),
    variables: {},
    result: {
      data: {
        product: {
          id: '1',
          name: 'Product 1',
          category: 'Category 1',
          price: 100,
        },
      },
    },
  },
];
