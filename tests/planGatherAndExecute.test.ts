import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { buildResolverQuery, execute } from '../src/execute.js';
import { planGather } from '../src/gather.js';
import { planSchema } from '../src/schemaPlan.js';
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
            {
              getFetch(sourceId) {
                const source = sources[sourceId];
                if (!source) {
                  throw new Error(`Source "${sourceId}" not found`);
                }
                return source.fetch;
              },
            },
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
    id: 'storefronts',
    type: 'Storefront',
    operation:
      'query storefront($id: ID!) { storefront(id: $id) { ...export } }',
    exports: ['id', 'name', 'products.upc'],
  },
  {
    id: 'products',
    type: 'Product',
    operation:
      'query ProductByUpc($Product_upc: ID!) { product(upc: $Product_upc) { ...export } }',
    exports: [
      'name',
      'manufacturer.products.upc',
      'manufacturer.products.name',
      'manufacturer.id',
    ],
  },
  {
    id: 'manufacturers',
    type: 'Manufacturer',
    operation:
      'query ManufacturerById($Manufacturer_id: ID!) { manufacturer(id: $Manufacturer_id) { ...export } }',
    exports: ['name'],
  },
])('should build proper query for $id resolver', (resolver) => {
  expect(buildResolverQuery(resolver)).toMatchSnapshot();
});
