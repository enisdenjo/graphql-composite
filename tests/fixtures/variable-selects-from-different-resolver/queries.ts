import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'VariableFromDifferentSubgraph',
    document: parse(/* GraphQL */ `
      query VariableFromDifferentSubgraph {
        products {
          price
        }
      }
    `),
    variables: {},
    result: {
      data: {
        products: [
          {
            price: 10,
          },
          {
            price: 14,
          },
        ],
      },
    },
  },
];
