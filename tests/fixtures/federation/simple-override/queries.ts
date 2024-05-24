import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'SharedFeed',
    document: parse(/* GraphQL */ `
      query SharedFeed {
        feed {
          createdAt
        }
      }
    `),
    result: {
      data: {
        feed: [
          {
            createdAt: 'p1-createdAt',
          },
          {
            createdAt: 'p2-createdAt',
          },
        ],
      },
    },
    variables: {},
  },
  {
    name: 'FeedAB',
    document: parse(/* GraphQL */ `
      query FeedAB {
        aFeed {
          createdAt
        }
        bFeed {
          createdAt
        }
      }
    `),
    result: {
      data: {
        aFeed: [
          {
            createdAt: 'p2-createdAt',
          },
        ],
        bFeed: [
          {
            createdAt: 'p1-createdAt',
          },
        ],
      },
    },
    variables: {},
  },
];
