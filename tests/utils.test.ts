import { parse, print } from 'graphql';
import { describe, expect, it } from 'vitest';
import { flattenFragments } from '../src/utils.js';

describe('flattenFragments', () => {
  it.each([
    {
      name: 'BasicInlineFragment',
      document: parse(/* GraphQL */ `
        {
          storefront {
            products {
              ... on Product {
                upc
                name
              }
            }
          }
        }
      `),
    },
    {
      name: 'NestedInlineFragment',
      document: parse(/* GraphQL */ `
        {
          storefront {
            products {
              ... on Product {
                name
                upc
                manufacturer {
                  ... on Manufacturer {
                    name
                  }
                  id
                }
              }
            }
          }
        }
      `),
    },
    {
      name: 'BasicFragmentDefinition',
      document: parse(/* GraphQL */ `
        {
          storefront {
            products {
              ...P
            }
          }
        }
        fragment P on Product {
          name
          upc
        }
      `),
    },
    {
      name: 'NestedFragmentDefinition',
      document: parse(/* GraphQL */ `
        {
          storefront {
            products {
              ...P
            }
          }
        }
        fragment P on Product {
          name
          upc
          manufacturer {
            ...M
            groundedAt
          }
        }
        fragment M on Manufacturer {
          id
          name
        }
      `),
    },
    {
      name: 'AliasesFragmentDefinition',
      document: parse(/* GraphQL */ `
        {
          storefront {
            pro: products {
              ...P
            }
          }
        }
        fragment P on Product {
          name
          id: upc
        }
      `),
    },
    {
      name: 'DirectivesFragmentDefinition',
      document: parse(/* GraphQL */ `
        {
          storefront {
            products {
              ...P
            }
          }
        }
        fragment P on Product {
          name
          upc @skip(if: false)
          manufacturer @include(if: true) {
            groundedAt
          }
        }
      `),
    },
    {
      name: 'DuplicateFieldsFragmentDefinition',
      document: parse(/* GraphQL */ `
        {
          storefront {
            products {
              ...P1
              ...P2
            }
          }
        }
        fragment P1 on Product {
          name
          upc
          manufacturer {
            name
            groundedAt
          }
        }
        fragment P2 on Product {
          id
          upc
          manufacturer {
            name
          }
        }
      `),
    },
  ])('should flatten fragments in $name', ({ document }) => {
    const flat = flattenFragments(document);
    expect(print(flat)).toMatchSnapshot();
  });
});
