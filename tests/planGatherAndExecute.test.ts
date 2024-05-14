import { describe, expect, it } from 'vitest';
import { execute } from '../src/execute.js';
import {
  buildResolverOperation,
  GatherPlanCompositeResolverExport,
  planGather,
} from '../src/gather.js';
import { TransportHTTP } from '../src/transport.js';
import { getFixtures } from './utils.js';

describe.each(await getFixtures())(
  'fixture $name',
  ({ schema, subgraphs, queries }) => {
    describe.each(queries)('query $name', ({ document, variables, result }) => {
      it('should plan gather', () => {
        expect(planGather(schema, document)).toMatchSnapshot();
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
          planGather(schema, document),
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
    operation:
      'query storefront($id: ID!) { storefront(id: $id) { ...__export } }',
    exports: [
      {
        kind: 'private', // doesnt matter
        name: 'id',
      },
      {
        kind: 'private', // doesnt matter
        name: 'name',
      },
      {
        kind: 'private', // doesnt matter
        name: 'products',
        selections: [
          {
            kind: 'private', // doesnt matter
            name: 'upc',
          },
        ],
      },
    ],
  },
  {
    name: 'ProductByUpc',
    operation:
      'query ProductByUpc($Product_upc: ID!) { product(upc: $Product_upc) { ...__export } }',
    exports: [
      {
        kind: 'private', // doesnt matter
        name: 'name',
      },
      {
        kind: 'private', // doesnt matter
        name: 'manufacturer',
        selections: [
          {
            kind: 'private', // doesnt matter
            name: 'products',
            selections: [
              {
                kind: 'private', // doesnt matter
                name: 'upc',
              },
              {
                kind: 'private', // doesnt matter
                name: 'name',
              },
            ],
          },
          {
            kind: 'private', // doesnt matter
            name: 'id',
          },
        ],
      },
    ],
  },
  {
    name: 'ManufacturerById',
    operation:
      'query ManufacturerById($Manufacturer_id: ID!) { manufacturer(id: $Manufacturer_id) { ...__export } }',
    exports: [
      {
        kind: 'private', // doesnt matter
        name: 'id',
      },
      {
        kind: 'private', // doesnt matter
        name: 'name',
      },
    ],
  },
  {
    name: 'ManufacturerNested',
    operation:
      'query ManufacturerNested { manufacturer { nested { deep { ...__export } } } }',
    exports: [
      {
        kind: 'private', // doesnt matter
        name: 'id',
      },
      {
        kind: 'private', // doesnt matter
        name: 'name',
      },
      {
        kind: 'private', // doesnt matter
        name: 'products',
        selections: [
          {
            kind: 'private', // doesnt matter
            name: 'manufacturer',
            selections: [
              {
                kind: 'private', // doesnt matter
                name: 'location',
              },
            ],
          },
          {
            kind: 'private', // doesnt matter
            name: 'name',
          },
        ],
      },
    ],
  },
  {
    name: 'FindDeepestPath',
    operation: 'query FindDeepestPath { manufacturer { nested { deep } } }',
    exports: [],
  },
  {
    name: 'MultipleTypes',
    operation: 'query MultipleTypes { productAndManufaturer { ...__export } }',
    exports: [
      {
        kind: 'private', // doesnt matter
        type: 'Product',
        selections: [
          {
            kind: 'private', // doesnt matter
            name: 'name',
          },
          {
            kind: 'private', // doesnt matter
            name: 'manufacturer',
            selections: [
              {
                kind: 'private', // doesnt matter
                name: 'products',
                selections: [
                  {
                    kind: 'private', // doesnt matter
                    name: 'upc',
                  },
                  {
                    kind: 'private', // doesnt matter
                    name: 'name',
                  },
                ],
              },
              {
                kind: 'private', // doesnt matter
                name: 'id',
              },
            ],
          },
        ],
      },
      {
        kind: 'private', // doesnt matter
        type: 'Manufacturer',
        selections: [
          {
            kind: 'private', // doesnt matter
            name: 'id',
          },
          {
            kind: 'private', // doesnt matter
            name: 'name',
          },
          {
            kind: 'private', // doesnt matter
            name: 'products',
            selections: [
              {
                kind: 'private', // doesnt matter
                name: 'manufacturer',
                selections: [
                  {
                    kind: 'private', // doesnt matter
                    name: 'location',
                  },
                ],
              },
              {
                kind: 'private', // doesnt matter
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
    operation: 'query Nested { product { ...__export } }',
    exports: [
      {
        kind: 'private', // doesnt matter
        type: 'Product',
        selections: [
          {
            kind: 'private', // doesnt matter
            name: 'name',
          },
          {
            kind: 'private', // doesnt matter
            name: 'manufacturer',
            selections: [
              {
                kind: 'private', // doesnt matter
                name: 'products',
                selections: [
                  {
                    kind: 'private', // doesnt matter
                    name: 'upc',
                  },
                  {
                    kind: 'private', // doesnt matter
                    name: 'name',
                  },
                ],
              },
              {
                kind: 'private', // doesnt matter
                type: 'Manufacturer',
                selections: [
                  {
                    kind: 'private', // doesnt matter
                    name: 'id',
                  },
                  {
                    kind: 'private', // doesnt matter
                    name: 'name',
                  },
                  {
                    kind: 'private', // doesnt matter
                    name: 'products',
                    selections: [
                      {
                        kind: 'private', // doesnt matter
                        name: 'manufacturer',
                        selections: [
                          {
                            kind: 'private', // doesnt matter
                            name: 'location',
                          },
                        ],
                      },
                      {
                        kind: 'private', // doesnt matter
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
  exports: GatherPlanCompositeResolverExport[];
}[])(
  'should build proper operation and find export path for $name resolver',
  ({ operation, exports }) => {
    expect(buildResolverOperation(operation, exports)).toMatchSnapshot();
  },
);
