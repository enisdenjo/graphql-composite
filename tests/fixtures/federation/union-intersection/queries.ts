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
  {
    name: 'BookAll',
    document: parse(/* GraphQL */ `
      query BookAll {
        book {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
          ... on Book {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        book: {
          __typename: 'Book',
          title: 'The Lord of the Rings',
        },
      },
    },
  },
  {
    name: 'AllMedia',
    document: parse(/* GraphQL */ `
      query AllMedia {
        media {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
          ... on Book {
            title
          }
        }
        book {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
          ... on Book {
            title
          }
        }
        song {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
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
          __typename: 'Book',
          title: 'The Lord of the Rings',
        },
        book: {
          __typename: 'Book',
          title: 'The Lord of the Rings',
        },
        song: {
          __typename: 'Song',
          title: 'Song Title',
        },
      },
    },
  },
];
