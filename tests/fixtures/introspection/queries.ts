import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'SchemaQuery',
    document: parse(/* GraphQL */ `
      query SchemaQuery {
        __schema {
          types {
            name
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {},
    },
  },
];
