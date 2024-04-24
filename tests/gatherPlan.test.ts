import fs from 'fs';
import path from 'path';
import { buildSchema, parse } from 'graphql';
import { expect, it } from 'vitest';
import { planGather } from '../src/planGather.js';

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

it('should plan gather', () => {
  expect(planGather(schema, document)).toMatchSnapshot();
});
