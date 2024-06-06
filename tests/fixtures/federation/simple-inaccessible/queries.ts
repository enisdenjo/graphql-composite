import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'UsersInAge',
    document: parse(/* GraphQL */ `
      query {
        usersInAge {
          id
          friends {
            id
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        usersInAge: [
          {
            id: 'u1',
            friends: [
              {
                id: 'u2',
              },
            ],
          },
          {
            id: 'u2',
            friends: [
              {
                id: 'u1',
              },
            ],
          },
        ],
      },
    },
  },
  {
    name: 'UsersInFriends',
    document: parse(/* GraphQL */ `
      query {
        usersInFriends {
          id
          friends {
            id
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        usersInFriends: [
          {
            id: 'u1',
            friends: [
              {
                id: 'u2',
              },
            ],
          },
          {
            id: 'u2',
            friends: [
              {
                id: 'u1',
              },
            ],
          },
        ],
      },
    },
  },
  // {
  //   name: 'InaccessibleEnumInInput',
  //   document: parse(/* GraphQL */ `
  //     query InaccessibleEnumInInput {
  //       usersInFriends {
  //         id
  //         friends(type: FRIEND) {
  //           id
  //         }
  //       }
  //     }
  //   `),
  //   variables: {},
  //   result: {
  //     errors: [...],
  //   },
  // },
  {
    name: 'InaccessibleEnumInOutput',
    document: parse(/* GraphQL */ `
      query InaccessibleEnumInOutput {
        usersInFriends {
          id
          friends {
            id
            type
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        usersInFriends: [
          {
            id: 'u1',
            friends: [
              {
                id: 'u2',
                type: null,
              },
            ],
          },
          {
            id: 'u2',
            friends: [
              {
                id: 'u1',
                type: null,
              },
            ],
          },
        ],
      },
    },
  },
];
