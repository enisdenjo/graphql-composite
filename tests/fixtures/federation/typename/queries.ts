import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'Union',
    document: parse(/* GraphQL */ `
      query Union {
        union {
          __typename
          typename: __typename
        }
      }
    `),
    variables: {},
    result: {
      data: {
        union: {
          __typename: 'Oven',
          typename: 'Oven',
        },
      },
    },
  },
  {
    name: 'Interface',
    document: parse(/* GraphQL */ `
      query Interface {
        interface {
          id
          __typename
          typename: __typename
          t: __typename
        }
      }
    `),
    variables: {},
    result: {
      data: {
        interface: {
          id: '2',
          __typename: 'Toaster',
          typename: 'Toaster',
          t: 'Toaster',
        },
      },
    },
  },
  {
    name: 'UnionMembersTypename',
    document: parse(/* GraphQL */ `
      query UnionMembersTypename {
        union {
          __typename
          ... on Oven {
            typename: __typename
          }
          ... on Toaster {
            typename: __typename
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        union: {
          __typename: 'Oven',
          typename: 'Oven',
        },
      },
    },
  },
  {
    name: 'InterfaceMembersTypename',
    document: parse(/* GraphQL */ `
      query InterfaceMembersTypename {
        interface {
          __typename
          ... on Oven {
            typename: __typename
          }
          ... on Toaster {
            typename: __typename
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        interface: {
          __typename: 'Toaster',
          typename: 'Toaster',
        },
      },
    },
  },
  {
    name: 'InterfaceObjectTypename',
    document: parse(/* GraphQL */ `
      query InterfaceObjectTypename {
        users {
          __typename
        }
      }
    `),
    variables: {},
    result: {
      data: {
        users: [
          {
            __typename: 'Admin',
          },
          {
            __typename: 'Admin',
          },
        ],
      },
    },
  },
];
