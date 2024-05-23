import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'NestedSamePriceProduct',
    document: parse(/* GraphQL */ `
      query NestedSamePriceProduct {
        product {
          samePriceProduct {
            ... on Product {
              samePriceProduct {
                __typename
              }
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        product: {
          samePriceProduct: {
            samePriceProduct: {
              __typename: 'Book',
            },
          },
        },
      },
    },
  },
];
