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
];
