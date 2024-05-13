import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'BasicCat',
    document: parse(/* GraphQL */ `
      query BasicCat {
        animal(name: "Cathew") {
          name
          type
          ... on Cat {
            meows
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        animal: {
          meows: true,
          name: 'Cathew',
          type: 'cat',
        },
      },
    },
  },
  {
    name: 'BasicNestedAnimal',
    document: parse(/* GraphQL */ `
      query BasicNestedAnimal {
        animal(name: "Dogeth") {
          name
          type
          ... on Dog {
            barks
            bestFriend {
              ... on Cat {
                meows
                name
              }
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        animal: {
          barks: true,
          bestFriend: {
            meows: true,
            name: 'Cathew',
          },
          name: 'Dogeth',
          type: 'dog',
        },
      },
    },
  },
];
