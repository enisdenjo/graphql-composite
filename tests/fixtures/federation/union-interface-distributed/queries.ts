import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'ProductsNodeFragmentId',
    document: parse(/* GraphQL */ `
      query ProductsNodeFragmentId {
        products {
          ... on Node {
            id
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        products: [
          {
            id: 'oven1',
          },
          {
            id: 'oven2',
          },
          {
            id: 'toaster1',
          },
          {
            id: 'toaster2',
          },
        ],
      },
    },
  },
  {
    name: 'NodesDiffFields',
    document: parse(/* GraphQL */ `
      query NodesDiffFields {
        nodes {
          ... on Toaster {
            warranty
          }
          ... on Oven {
            id
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        nodes: [
          {
            warranty: 3,
          },
          {
            warranty: 4,
          },
        ],
      },
    },
  },
  {
    name: 'NodesId',
    document: parse(/* GraphQL */ `
      query NodesId {
        nodes {
          id
        }
      }
    `),
    variables: {},
    result: {
      data: {
        nodes: [
          {
            id: 'toaster1',
          },
          {
            id: 'toaster2',
          },
        ],
      },
    },
  },
  {
    name: 'ToastersFragments',
    document: parse(/* GraphQL */ `
      query ToastersFragments {
        toasters {
          ...ToasterFragment
          ...NodeFragment
        }
      }

      fragment ToasterFragment on Toaster {
        warranty
      }

      fragment NodeFragment on Node {
        id
        __typename
      }
    `),
    variables: {},
    result: {
      data: {
        toasters: [
          {
            id: 'toaster1',
            warranty: 3,
            __typename: 'Toaster',
          },
          {
            id: 'toaster2',
            warranty: 4,
            __typename: 'Toaster',
          },
        ],
      },
    },
  },
  {
    name: 'Warranty',
    document: parse(/* GraphQL */ `
      query Warranty {
        node(id: "toaster1") {
          ... on Toaster {
            warranty
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        node: {
          warranty: 3,
        },
      },
    },
  },
];
