import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { execute } from '../src/execute.js';
import { planSchema } from '../src/fusion/planSchema.js';
import { buildResolverOperation, planGather } from '../src/gather.js';
import { TransportHTTP } from '../src/transport.js';
import { getFixtures } from './utils.js';

describe.each(await getFixtures())(
  'fixture $name',
  ({ fusiongraph, subgraphs, queries }) => {
    const schema = buildSchema(fusiongraph, {
      assumeValid: true,
    });

    it('should plan schema', () => {
      expect(planSchema(schema)).toMatchSnapshot();
    });

    describe.each(queries)('query $name', ({ document, variables }) => {
      it('should plan gather', () => {
        expect(planGather(planSchema(schema), document)).toMatchSnapshot();
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
            planGather(planSchema(schema), document),
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
  {
    name: 'FindDeepestPath',
    operation: 'query FindDeepestPath { manufacturer { nested { deep } } }',
    type: 'String',
    fields: [],
  },
])(
  'should build proper operation and find export path for $name resolver',
  ({ operation, type, fields }) => {
    expect(buildResolverOperation(operation, type, fields)).toMatchSnapshot();
  },
);
