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
  {
    name: 'SamePriceProductPrice',
    document: parse(/* GraphQL */ `
      query SamePriceProductPrice {
        product {
          ... on Book {
            samePriceProduct {
              id
              price
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
            id: '3',
            price: 10.99,
          },
        },
      },
    },
  },
];
