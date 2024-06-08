import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'SharedRootSingle',
    document: parse(/* GraphQL */ `
      query SharedRootSingle {
        product {
          id
          name
          category
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
        },
      },
    },
  },
  {
    name: 'SharedRootMultiple',
    document: parse(/* GraphQL */ `
      query SharedRootMultiple {
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
