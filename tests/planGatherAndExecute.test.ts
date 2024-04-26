import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { execute } from '../src/execute.js';
import { buildResolverOperation, planGather } from '../src/gather.js';
import { planSchema } from '../src/schemaPlan.js';
import { TransportHTTP } from '../src/transport.js';
import { getFixtures } from './utils.js';

describe.each(await getFixtures())(
  'fixture $name',
  ({ fusiongraph, sources, queries }) => {
    const schema = buildSchema(fusiongraph, {
      assumeValid: true,
    });

    it('should plan schema', () => {
      expect(planSchema(schema)).toMatchSnapshot();
    });

    describe.each(queries)('query $name', ({ document, variables }) => {
      it('should plan gather', () => {
        expect(planGather(schema, document)).toMatchSnapshot();
      });

      it('should execute', async () => {
        await expect(
          execute(
            Object.entries(sources).reduce(
              (agg, [name, source]) => ({
                ...agg,
                [name]: new TransportHTTP(source.fetch),
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
    type: 'Storefront',
    fields: ['id', 'name', 'products.upc'],
  },
  {
    name: 'ProductByUpc',
    operation:
      'query ProductByUpc($Product_upc: ID!) { product(upc: $Product_upc) { ...__export } }',
    type: 'Product',
    fields: [
      'name',
      'manufacturer.products.upc',
      'manufacturer.products.name',
      'manufacturer.id',
    ],
  },
  {
    name: 'ManufacturerById',
    operation:
      'query ManufacturerById($Manufacturer_id: ID!) { manufacturer(id: $Manufacturer_id) { ...__export } }',
    type: 'Manufacturer',
    fields: ['id', 'name'],
  },
  {
    name: 'ManufacturerNested',
    operation:
      'query ManufacturerNested { manufacturer { nested { deep { ...__export } } } }',
    type: 'Manufacturer',
    fields: ['id', 'name', 'products.manufacturer.location', 'products.name'],
  },
])(
  'should build proper operation and find __export path for $name resolver',
  ({ operation, type, fields }) => {
    expect(buildResolverOperation(operation, type, fields)).toMatchSnapshot();
  },
);
