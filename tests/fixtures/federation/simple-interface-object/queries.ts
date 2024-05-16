import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'BasicUsers',
    document: parse(/* GraphQL */ `
      query BasicUsers {
        users {
          id
          name
        }
      }
    `),
    variables: {},
    result: {
      data: {
        users: [
          {
            id: 'u1',
            name: 'u1-name',
          },
          {
            id: 'u2',
            name: 'u2-name',
          },
        ],
      },
    },
  },
];
