import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'SharedRoot',
    document: parse(/* GraphQL */ `
      query SharedRoot {
        product {
          id
          name
          category
          price
        }
      }
    `),
    variables: {},
    result: {
      data: {
        anotherUsers: [
          {
            id: 'u1',
            name: 'u1-name',
            username: 'u1-username',
          },
          {
            id: 'u2',
            name: 'u2-name',
            username: 'u2-username',
          },
        ],
      },
    },
  },
];
