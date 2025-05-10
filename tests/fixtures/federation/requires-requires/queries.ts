import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'CanAfford',
    document: parse(/* GraphQL */ `
      query CanAfford {
        product {
          canAfford
        }
      }
    `),
    variables: {},
    result: {
      data: {
        product: {
          canAfford: false,
        },
      },
    },
  },
  {
    name: 'IsExpensive',
    document: parse(/* GraphQL */ `
      query IsExpensive {
        product {
          isExpensive
        }
      }
    `),
    variables: {},
    result: {
      data: {
        product: {
          isExpensive: true,
        },
      },
    },
  },
  {
    name: 'IsExpensiveCanAfford',
    document: parse(/* GraphQL */ `
      query IsExpensiveCanAfford {
        product {
          isExpensive
          canAfford
        }
      }
    `),
    variables: {},
    result: {
      data: {
        product: {
          isExpensive: true,
          canAfford: false,
        },
      },
    },
  },
  {
    name: 'CanAffordWithDiscount',
    document: parse(/* GraphQL */ `
      query CanAffordWithDiscount {
        product {
          canAffordWithDiscount
        }
      }
    `),
    variables: {},
    result: {
      data: {
        product: {
          canAffordWithDiscount: true,
        },
      },
    },
  },
  {
    name: 'CanAffordCanAffordWithDiscount',
    document: parse(/* GraphQL */ `
      query CanAffordCanAffordWithDiscount {
        product {
          canAfford
          canAffordWithDiscount
        }
      }
    `),
    variables: {},
    result: {
      data: {
        product: {
          canAfford: false,
          canAffordWithDiscount: true,
        },
      },
    },
  },
];
