import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'RequiresAnotherUsers',
    document: parse(/* GraphQL */ `
      query RequiresAnotherUsers {
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
    name: 'RequiresUsers',
    document: parse(/* GraphQL */ `
      query RequiresUsers {
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
  {
    name: 'AnotherUsersUserSpreadAge',
    document: parse(/* GraphQL */ `
      query AnotherUsersUserSpreadAge {
        anotherUsers {
          ... on User {
            age
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        anotherUsers: [
          {
            age: 11,
          },
          {
            age: 22,
          },
        ],
      },
    },
  },
  {
    name: 'UsersUserSpreadAge',
    document: parse(/* GraphQL */ `
      query UsersUserSpreadAge {
        users {
          ... on User {
            age
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        users: [
          {
            age: 11,
          },
          {
            age: 22,
          },
        ],
      },
    },
  },
  {
    name: 'AnotherUsersUserSpreadAndMore',
    document: parse(/* GraphQL */ `
      query AnotherUsersUserSpreadAndMore {
        anotherUsers {
          ... on User {
            age
            id
            name
            username
          }
          id
          name
        }
      }
    `),
    variables: {},
    result: {
      data: {
        anotherUsers: [
          {
            age: 11,
            id: 'u1',
            name: 'u1-name',
            username: 'u1-username',
          },
          {
            age: 22,
            id: 'u2',
            name: 'u2-name',
            username: 'u2-username',
          },
        ],
      },
    },
  },
  {
    name: 'UsersUserSpreadAndMore',
    document: parse(/* GraphQL */ `
      query UsersUserSpreadAndMore {
        users {
          ... on User {
            age
            id
            name
            username
          }
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
            age: 11,
            id: 'u1',
            name: 'u1-name',
            username: 'u1-username',
          },
          {
            age: 22,
            id: 'u2',
            name: 'u2-name',
            username: 'u2-username',
          },
        ],
      },
    },
  },
];
