import fs from 'fs';
import path from 'path';
import { buildSchema, parse } from 'graphql';
import { expect, it } from 'vitest';
import { planGather, planGatherResolvers } from '../src/planGather.js';
import { planSchema } from '../src/schemaPlan.js';

const schema = buildSchema(
  fs.readFileSync(
    path.resolve(__dirname, 'fixtures', 'fusiongraph.graphql'),
    'utf-8',
  ),
  { assumeValid: true },
);

const document = parse(/* GraphQL */ `
  {
    storefront(id: "2") {
      id
      name
      products {
        upc
        name
        manufacturer {
          products {
            upc
            name
          }
          name
        }
      }
    }
  }
`);

it('should plan gather and resolvers', async () => {
  const plan = planGather(schema, document);
  expect(plan).toMatchSnapshot();
  expect(planGatherResolvers(planSchema(schema), plan)).toMatchSnapshot();
});
