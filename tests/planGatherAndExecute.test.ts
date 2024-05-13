import { describe, expect, it } from 'vitest';
import { execute } from '../src/execute.js';
import { buildResolverOperation, planGather } from '../src/gather.js';
import { TransportHTTP } from '../src/transport.js';
import { getFixtures } from './utils.js';

describe.each(await getFixtures())(
  'fixture $name',
  ({ schema, subgraphs, queries }) => {
    describe.each(queries)('query $name', ({ document, variables }) => {
      it('should plan gather', () => {
        expect(planGather(schema, document)).toMatchSnapshot();
      });

      it('should execute', async () => {
        await expect(
          execute(
            Object.entries(subgraphs).reduce(
              (agg, [name, subgraph]) => ({
                ...agg,
                [name]: new TransportHTTP(subgraph.fetch),
              }),
              {},
            ),
            planGather(schema, document),
            variables,
          ),
        ).resolves.toMatchSnapshot();
      });
    });
  },
);

it.each([
  {
    name: 'storefront',
    operation:
      'query storefront($id: ID!) { storefront(id: $id) { ...__export } }',
    fields: { Storefront: ['id', 'name', 'products.upc'] },
  },
  {
    name: 'ProductByUpc',
    operation:
      'query ProductByUpc($Product_upc: ID!) { product(upc: $Product_upc) { ...__export } }',
    fields: {
      Product: [
        'name',
        'manufacturer.products.upc',
        'manufacturer.products.name',
        'manufacturer.id',
      ],
    },
  },
  {
    name: 'ManufacturerById',
    operation:
      'query ManufacturerById($Manufacturer_id: ID!) { manufacturer(id: $Manufacturer_id) { ...__export } }',
    fields: { Manufacturer: ['id', 'name'] },
  },
  {
    name: 'ManufacturerNested',
    operation:
      'query ManufacturerNested { manufacturer { nested { deep { ...__export } } } }',
    fields: {
      Manufacturer: [
        'id',
        'name',
        'products.manufacturer.location',
        'products.name',
      ],
    },
  },
  {
    name: 'FindDeepestPath',
    operation: 'query FindDeepestPath { manufacturer { nested { deep } } }',
    fields: {},
  },
  {
    name: 'MultipleTypes',
    operation: 'query MultipleTypes { productAndManufaturer { ...__export } }',
    fields: {
      Product: [
        'name',
        'manufacturer.products.upc',
        'manufacturer.products.name',
        'manufacturer.id',
      ],
      Manufacturer: [
        'id',
        'name',
        'products.manufacturer.location',
        'products.name',
      ],
    },
  },
])(
  'should build proper operation and find export path for $name resolver',
  ({ operation, fields }) => {
    expect(buildResolverOperation(operation, fields)).toMatchSnapshot();
  },
);
