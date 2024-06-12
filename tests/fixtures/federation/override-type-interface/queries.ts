import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'Feed',
    document: parse(/* GraphQL */ `
      query Feed {
        feed {
          id
          createdAt
        }
      }
    `),
    variables: {},
    result: {
      data: {
        feed: [
          {
            id: 'i1',
            createdAt: 'i1-createdAt',
          },
          {
            id: 'i2',
            createdAt: 'i2-createdAt',
          },
        ],
      },
    },
  },
  {
    name: 'EmptyFeed',
    document: parse(/* GraphQL */ `
      query EmptyFeed {
        feed {
          ... on TextPost {
            id
            body
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        feed: [{}, {}],
      },
    },
  },
  {
    name: 'AnotherFeed',
    document: parse(/* GraphQL */ `
      query AnotherFeed {
        anotherFeed {
          createdAt
        }
      }
    `),
    variables: {},
    result: {
      data: {
        anotherFeed: [
          {
            createdAt: 'i1-createdAt',
          },
          {
            createdAt: 'i2-createdAt',
          },
        ],
      },
    },
  },
  {
    name: 'AnotherFeedFragment',
    document: parse(/* GraphQL */ `
      query AnotherFeedFragment {
        anotherFeed {
          createdAt
          id
          ... on ImagePost {
            createdAt
            id
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        anotherFeed: [
          {
            createdAt: 'i1-createdAt',
            id: 'i1',
          },
          {
            createdAt: 'i2-createdAt',
            id: 'i2',
          },
        ],
      },
    },
  },
];
