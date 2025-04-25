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
  {
    name: 'NestedSamePriceProductPriceMore',
    document: parse(/* GraphQL */ `
      query NestedSamePriceProductPriceMore {
        product {
          __typename
          samePriceProduct {
            __typename
            ... on Book {
              id
            }
            samePriceProduct {
              __typename
              ... on Book {
                id
              }
            }
          }
          ... on Book {
            __typename
            id
            price
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
          __typename: 'Book',
          samePriceProduct: {
            __typename: 'Book',
            id: '3',
            samePriceProduct: {
              __typename: 'Book',
              id: '1',
            },
            price: 10.99,
          },
          id: '1',
          price: 10.99,
        },
      },
    },
  },
];
