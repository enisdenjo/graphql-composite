import { buildSchema, validate } from 'graphql';
import { describe, expect, it } from 'vitest';
import { execute, populateUsingPublicExports } from '../src/execute.js';
import {
  buildResolverOperation,
  OperationExport,
  planGather,
} from '../src/gather.js';
import { TransportHTTP } from '../src/transport.js';
import { getFixtures } from './utils.js';

describe.each(await getFixtures())(
  'fixture $name',
  ({ blueprint, subgraphs, queries }) => {
    describe.each(queries)('query $name', ({ document, variables, result }) => {
      it('should plan gather', () => {
        const errors = validate(buildSchema(blueprint.schema), document);
        if (errors.length) {
          expect({ errors }).toEqual(result);
          return;
        }
        expect(planGather(blueprint, document)).toMatchSnapshot();
      });

      it('should execute and explain', async () => {
        const errors = validate(buildSchema(blueprint.schema), document);
        if (errors.length) {
          expect({ errors }).toEqual(result);
          return;
        }
        const p = planGather(blueprint, document);
        // console.dir(p, { depth: 3000 });
        const { extensions, ...actualResult } = await execute(
          Object.entries(subgraphs).reduce(
            (agg, [name, subgraph]) => ({
              ...agg,
              [name]: new TransportHTTP(subgraph.fetch),
            }),
            {},
          ),
          p,
          variables,
        );
        expect(actualResult).toEqual(result);
        expect(extensions?.explain).toMatchSnapshot();
      });
    });
  },
);

it.each([
  {
    name: 'storefront',
    operation: /* GraphQL */ `
      query storefront($id: ID!) {
        storefront(id: $id) {
          ...__export
        }
      }
    `,
    exports: [
      {
        kind: 'scalar',
        name: 'id',
      },
      {
        kind: 'scalar',
        name: 'name',
      },
      {
        kind: 'object',
        name: 'products',
        selections: [
          {
            kind: 'scalar',
            name: 'upc',
          },
        ],
      },
    ],
  },
  {
    name: 'ProductByUpc',
    operation: /* GraphQL */ `
      query ProductByUpc($Product_upc: ID!) {
        product(upc: $Product_upc) {
          ...__export
        }
      }
    `,
    exports: [
      {
        kind: 'scalar',
        name: 'name',
      },
      {
        kind: 'object',
        name: 'manufacturer',
        selections: [
          {
            kind: 'object',
            name: 'products',
            selections: [
              {
                kind: 'scalar',
                name: 'upc',
              },
              {
                kind: 'scalar',
                name: 'name',
              },
            ],
          },
          {
            kind: 'scalar',
            name: 'id',
          },
        ],
      },
    ],
  },
  {
    name: 'ManufacturerById',
    operation: /* GraphQL */ `
      query ManufacturerById($Manufacturer_id: ID!) {
        manufacturer(id: $Manufacturer_id) {
          ...__export
        }
      }
    `,
    exports: [
      {
        kind: 'scalar',
        name: 'id',
      },
      {
        kind: 'scalar',
        name: 'name',
      },
    ],
  },
  {
    name: 'ManufacturerNested',
    operation: /* GraphQL */ `
      query ManufacturerNested {
        manufacturer {
          nested {
            deep {
              ...__export
            }
          }
        }
      }
    `,
    exports: [
      {
        kind: 'scalar',
        name: 'id',
      },
      {
        kind: 'scalar',
        name: 'name',
      },
      {
        kind: 'object',
        name: 'products',
        selections: [
          {
            kind: 'object',
            name: 'manufacturer',
            selections: [
              {
                kind: 'scalar',
                name: 'location',
              },
            ],
          },
          {
            kind: 'scalar',
            name: 'name',
          },
        ],
      },
    ],
  },
  {
    name: 'FindDeepestPath',
    operation: /* GraphQL */ `
      query FindDeepestPath {
        manufacturer {
          nested {
            deep
          }
        }
      }
    `,
    exports: [],
  },
  {
    name: 'MultipleTypes',
    operation: /* GraphQL */ `
      query MultipleTypes {
        productAndManufaturer {
          ...__export
        }
      }
    `,
    exports: [
      {
        kind: 'fragment',
        typeCondition: 'Product',
        selections: [
          {
            kind: 'scalar',
            name: 'name',
          },
          {
            kind: 'object',
            name: 'manufacturer',
            selections: [
              {
                kind: 'object',
                name: 'products',
                selections: [
                  {
                    kind: 'scalar',
                    name: 'upc',
                  },
                  {
                    kind: 'scalar',
                    name: 'name',
                  },
                ],
              },
              {
                kind: 'scalar',
                name: 'id',
              },
            ],
          },
        ],
      },
      {
        kind: 'fragment',
        typeCondition: 'Manufacturer',
        selections: [
          {
            kind: 'scalar',
            name: 'id',
          },
          {
            kind: 'scalar',
            name: 'name',
          },
          {
            kind: 'object',
            name: 'products',
            selections: [
              {
                kind: 'object',
                name: 'manufacturer',
                selections: [
                  {
                    kind: 'scalar',
                    name: 'location',
                  },
                ],
              },
              {
                kind: 'scalar',
                name: 'name',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Nested',
    operation: /* GraphQL */ `
      query Nested {
        product {
          ...__export
        }
      }
    `,
    exports: [
      {
        kind: 'fragment',
        typeCondition: 'Product',
        selections: [
          {
            kind: 'scalar',
            name: 'name',
          },
          {
            kind: 'object',
            name: 'manufacturer',
            selections: [
              {
                kind: 'object',
                name: 'products',
                selections: [
                  {
                    kind: 'scalar',
                    name: 'upc',
                  },
                  {
                    kind: 'scalar',
                    name: 'name',
                  },
                ],
              },
              {
                kind: 'fragment',
                typeCondition: 'Manufacturer',
                selections: [
                  {
                    kind: 'scalar',
                    name: 'id',
                  },
                  {
                    kind: 'scalar',
                    name: 'name',
                  },
                  {
                    kind: 'object',
                    name: 'products',
                    selections: [
                      {
                        kind: 'object',
                        name: 'manufacturer',
                        selections: [
                          {
                            kind: 'scalar',
                            name: 'location',
                          },
                        ],
                      },
                      {
                        kind: 'scalar',
                        name: 'name',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
] satisfies {
  name: string;
  operation: string;
  exports: OperationExport[];
}[])(
  'should build proper operation and find export path for $name resolver',
  ({ operation, exports }) => {
    expect(buildResolverOperation(operation, exports)).toMatchSnapshot();
  },
);

it.each([
  {
    exports: [
      {
        kind: 'scalar',
        name: 'num',
      },
      {
        kind: 'scalar',
        name: 'str',
      },
    ],
    exportData: {
      num: 1,
      str: '2',
    },
    dest: {
      num: 1,
      str: '2',
    },
  },
  {
    exports: [
      {
        kind: 'object',
        name: 'person',
        selections: [
          {
            kind: 'scalar',
            name: 'num',
          },
        ],
      },
      {
        kind: 'scalar',
        name: 'str',
      },
    ],
    exportData: {
      person: {
        num: 1,
      },
      str: '2',
    },
    dest: {
      person: {
        num: 1,
      },
      str: '2',
    },
  },
  {
    exports: [
      {
        kind: 'object',
        name: 'cats',
        selections: [
          {
            kind: 'scalar',
            name: 'name',
          },
        ],
      },
    ],
    exportData: {
      cats: [
        {
          name: 'cathew',
        },
        {
          name: 'cathrine',
        },
      ],
    },
    dest: {
      cats: [
        {
          name: 'cathew',
        },
        {
          name: 'cathrine',
        },
      ],
    },
  },
  {
    exports: [
      {
        kind: 'object',
        name: 'users',
        selections: [
          {
            kind: 'scalar',
            name: 'id',
          },
          {
            kind: 'scalar',
            name: 'name',
          },
          {
            kind: 'object',
            name: 'friends',
            selections: [
              {
                kind: 'scalar',
                name: 'id',
              },
              {
                kind: 'scalar',
                name: 'name',
              },
            ],
          },
        ],
      },
    ],
    exportData: {
      users: [
        {
          id: '1',
          name: 'john',
          friends: [
            {
              id: '2',
              name: 'jane',
            },
          ],
        },
        {
          id: '2',
          name: 'jenny',
          friends: [
            {
              id: '3',
              name: 'jane',
            },
          ],
        },
        {
          id: '3',
          name: 'jane',
          friends: [
            {
              id: '1',
              name: 'john',
            },
            {
              id: '2',
              name: 'jenny',
            },
          ],
        },
      ],
    },
    dest: {
      users: [
        {
          id: '1',
          name: 'john',
          friends: [
            {
              id: '2',
              name: 'jane',
            },
          ],
        },
        {
          id: '2',
          name: 'jenny',
          friends: [
            {
              id: '3',
              name: 'jane',
            },
          ],
        },
        {
          id: '3',
          name: 'jane',
          friends: [
            {
              id: '1',
              name: 'john',
            },
            {
              id: '2',
              name: 'jenny',
            },
          ],
        },
      ],
    },
  },
] satisfies {
  exports: OperationExport[];
  exportData: unknown;
  dest: Record<string, unknown>;
}[])(
  'should populate dest with export data using defined exports to create $dest',
  ({ exports, exportData, dest }) => {
    const actualDest: Record<string, unknown> = {};
    populateUsingPublicExports(exports, exportData, actualDest);
    expect(actualDest).toEqual(dest);
  },
);
