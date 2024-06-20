import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'InternalAlias',
    // User.id and Admin.id have similar output types,
    // but one returns a non-nullable field and the other a nullable field.
    // To avoid a GraphQL error, we need to alias the field.
    document: parse(/* GraphQL */ `
      query InternalAlias {
        users {
          id
          name
        }
        accounts {
          ... on User {
            id
            name
          }
          ... on Admin {
            id
            name
          }
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
        ],
        accounts: [
          {
            id: 'u1',
            name: 'u1-name',
          },
          {
            id: 'a1',
            name: 'a1-name',
          },
        ],
      },
    },
  },
];
