import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'RequiresAnotherUsersJustUsername',
    document: parse(/* GraphQL */ `
      query RequiresAnotherUsersJustUsername {
        anotherUsers {
          username
        }
      }
    `),
    variables: {},
    result: {
      data: {
        anotherUsers: [
          {
            username: 'u1-username',
          },
          {
            username: 'u2-username',
          },
        ],
      },
    },
  },
];
