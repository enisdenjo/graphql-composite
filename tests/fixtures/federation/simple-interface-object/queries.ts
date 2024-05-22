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
  {
    name: 'AnotherUsersWithUserSpread',
    document: parse(/* GraphQL */ `
      query AnotherUsersWithUserSpread {
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
    name: 'UsersWithUserSpread',
    document: parse(/* GraphQL */ `
      query UsersWithUserSpread {
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
    name: 'AnotherUsersWithAdvancedUserSpread',
    document: parse(/* GraphQL */ `
      query AnotherUsersWithAdvancedUserSpread {
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
    name: 'UsersWithAdvancedUserSpread',
    document: parse(/* GraphQL */ `
      query UsersWithAdvancedUserSpread {
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
  {
    name: 'AccountsNames',
    document: parse(/* GraphQL */ `
      query AccountsNames {
        accounts {
          name
        }
      }
    `),
    variables: {},
    result: {
      data: {
        accounts: [
          {
            name: 'Alice',
          },
          {
            name: 'Bob',
          },
          {
            name: 'Charlie',
          },
        ],
      },
    },
  },
  {
    name: 'AccountsSpreadAdmin',
    document: parse(/* GraphQL */ `
      query AccountsSpreadAdmin {
        accounts {
          ... on Admin {
            name
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        accounts: [
          {
            name: 'Alice',
          },
          {
            name: 'Bob',
          },
          {},
        ],
      },
    },
  },
  {
    name: 'AccountsWithTypename',
    document: parse(/* GraphQL */ `
      query AccountsWithTypename {
        accounts {
          name
          # NOTE
          # __typename is not available in the interfaceObject, needs to be resolved indirectly
          __typename
        }
      }
    `),
    variables: {},
    result: {
      data: {
        accounts: [
          {
            name: 'Alice',
            __typename: 'Admin',
          },
          {
            name: 'Bob',
            __typename: 'Admin',
          },
          {
            name: 'Charlie',
            __typename: 'Regular',
          },
        ],
      },
    },
  },
  {
    name: 'AccountsWithAdminAndTypename',
    document: parse(/* GraphQL */ `
      query AccountsWithAdminAndTypename {
        accounts {
          ... on Admin {
            __typename
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        accounts: [
          {
            __typename: 'Admin',
          },
          {
            __typename: 'Admin',
          },
          {},
        ],
      },
    },
  },
  {
    name: 'AccountsIsActive',
    document: parse(/* GraphQL */ `
      query AccountsIsActive {
        accounts {
          id
          isActive
        }
      }
    `),
    variables: {},
    result: {
      data: {
        accounts: [
          {
            id: 'u1',
            isActive: false,
          },
          {
            id: 'u2',
            isActive: false,
          },
          {
            id: 'u3',
            isActive: false,
          },
        ],
      },
    },
  },
  {
    name: 'AccountsIsActiveOnAdmin',
    document: parse(/* GraphQL */ `
      query AccountsIsActiveOnAdmin {
        accounts {
          # NOTE
          # id is available in the interfaceObject and can be resolved as there's no type condition involved
          id
          ... on Admin {
            isActive
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        accounts: [
          {
            id: 'u1',
            isActive: true,
          },
          {
            id: 'u2',
            isActive: true,
          },
          {
            id: 'u3',
          },
        ],
      },
    },
  },
];
