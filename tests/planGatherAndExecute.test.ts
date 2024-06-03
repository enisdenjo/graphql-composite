import { describe, expect, it } from 'vitest';
import { execute } from '../src/execute.js';
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
        expect(planGather(blueprint, document)).toMatchSnapshot();
      });

      it('should execute and explain', async () => {
        const { extensions, ...actualResult } = await execute(
          Object.entries(subgraphs).reduce(
            (agg, [name, subgraph]) => ({
              ...agg,
              [name]: new TransportHTTP(subgraph.fetch),
            }),
            {},
          ),
          planGather(blueprint, document),
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
        property: 'id',
      },
      {
        kind: 'scalar',
        name: 'name',
        property: 'name',
      },
      {
        kind: 'object',
        name: 'products',
        property: 'products',
        selections: [
          {
            kind: 'scalar',
            name: 'upc',
            property: 'upc',
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
        property: 'name',
      },
      {
        kind: 'object',
        name: 'manufacturer',
        property: 'manufacturer',
        selections: [
          {
            kind: 'object',
            name: 'products',
            property: 'products',
            selections: [
              {
                kind: 'scalar',
                name: 'upc',
                property: 'upc',
              },
              {
                kind: 'scalar',
                name: 'name',
                property: 'name',
              },
            ],
          },
          {
            kind: 'scalar',
            name: 'id',
            property: 'id',
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
        property: 'id',
      },
      {
        kind: 'scalar',
        name: 'name',
        property: 'name',
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
        property: 'id',
      },
      {
        kind: 'scalar',
        name: 'name',
        property: 'name',
      },
      {
        kind: 'object',
        name: 'products',
        property: 'products',
        selections: [
          {
            kind: 'object',
            name: 'manufacturer',
            property: 'manufacturer',
            selections: [
              {
                kind: 'scalar',
                name: 'location',
                property: 'location',
              },
            ],
          },
          {
            kind: 'scalar',
            name: 'name',
            property: 'name',
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
            property: 'name',
          },
          {
            kind: 'object',
            name: 'manufacturer',
            property: 'manufacturer',
            selections: [
              {
                kind: 'object',
                name: 'products',
                property: 'products',
                selections: [
                  {
                    kind: 'scalar',
                    name: 'upc',
                    property: 'upc',
                  },
                  {
                    kind: 'scalar',
                    name: 'name',
                    property: 'name',
                  },
                ],
              },
              {
                kind: 'scalar',
                name: 'id',
                property: 'id',
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
            property: 'id',
          },
          {
            kind: 'scalar',
            name: 'name',
            property: 'name',
          },
          {
            kind: 'object',
            name: 'products',
            property: 'products',
            selections: [
              {
                kind: 'object',
                name: 'manufacturer',
                property: 'manufacturer',
                selections: [
                  {
                    kind: 'scalar',
                    name: 'location',
                    property: 'location',
                  },
                ],
              },
              {
                kind: 'scalar',
                name: 'name',
                property: 'name',
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
            property: 'name',
          },
          {
            kind: 'object',
            name: 'manufacturer',
            property: 'manufacturer',
            selections: [
              {
                kind: 'object',
                name: 'products',
                property: 'products',
                selections: [
                  {
                    kind: 'scalar',
                    name: 'upc',
                    property: 'upc',
                  },
                  {
                    kind: 'scalar',
                    name: 'name',
                    property: 'name',
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
                    property: 'id',
                  },
                  {
                    kind: 'scalar',
                    name: 'name',
                    property: 'name',
                  },
                  {
                    kind: 'object',
                    name: 'products',
                    property: 'products',
                    selections: [
                      {
                        kind: 'object',
                        name: 'manufacturer',
                        property: 'manufacturer',
                        selections: [
                          {
                            kind: 'scalar',
                            name: 'location',
                            property: 'location',
                          },
                        ],
                      },
                      {
                        kind: 'scalar',
                        name: 'name',
                        property: 'name',
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
