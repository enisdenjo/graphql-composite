import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'MediaTypename',
    document: parse(/* GraphQL */ `
      query MediaTypename {
        media {
          __typename
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {
          __typename: 'Book',
        },
      },
    },
  },
  {
    name: 'MediaBook',
    document: parse(/* GraphQL */ `
      query MediaBook {
        media {
          ... on Book {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {
          title: 'The Lord of the Rings',
        },
      },
    },
  },
  {
    name: 'MediaMovie',
    document: parse(/* GraphQL */ `
      query MediaMovie {
        media {
          ... on Movie {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {},
      },
    },
  },
  {
    name: 'MediaBookMovie',
    document: parse(/* GraphQL */ `
      query MediaBookMovie {
        media {
          ... on Book {
            title
          }
          ... on Movie {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {
          title: 'The Lord of the Rings',
        },
      },
    },
  },
];
