import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'AnotherUsers',
    document: parse(/* GraphQL */ `
      query AnotherUsers {
        anotherUsers {
          id
          name
          username
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
  {
    name: 'UsersWithUsername',
    document: parse(/* GraphQL */ `
      query UsersWithUsername {
        users {
          id
          name
          username
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
