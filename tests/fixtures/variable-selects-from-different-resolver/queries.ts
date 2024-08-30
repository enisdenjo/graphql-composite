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
  {
    name: 'VariableFromDifferentSubgraphAndAll',
    document: parse(/* GraphQL */ `
      query VariableFromDifferentSubgraphAndAll {
        products {
          id
          upc
          name
          price
        }
      }
    `),
    variables: {},
    result: {
      data: {
        products: [
          {
            id: '1',
            upc: 'h1',
            name: 'Hazelnut',
            price: 10,
          },
          {
            id: '2',
            upc: 's2',
            name: 'Sunflower Seeds',
            price: 14,
          },
        ],
      },
    },
  },
];
