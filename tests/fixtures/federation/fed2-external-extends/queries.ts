import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'All',
    document: parse(/* GraphQL */ `
      query All {
        randomUser {
          id
          name
        }
        userById(id: "u2") {
          id
          name
          nickname
        }
      }
    `),
    variables: {},
    result: {
      data: {
        randomUser: {
          id: 'u1',
          name: 'u1-name',
        },
        userById: {
          id: 'u2',
          name: 'u2-name',
          nickname: 'u2-nickname',
        },
      },
    },
  },
  {
    name: 'Random',
    document: parse(/* GraphQL */ `
      query Random {
        randomUser {
          id
          rid
        }
      }
    `),
    variables: {},
    result: {
      data: {
        randomUser: {
          id: 'u1',
          rid: 'u1-rid',
        },
      },
    },
  },
];
