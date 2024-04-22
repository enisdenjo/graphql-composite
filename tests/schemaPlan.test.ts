import fs from 'fs/promises';
import path from 'path';
import { buildSchema } from 'graphql';
import { expect, it } from 'vitest';
import { planSchema } from '../src/schemaPlan.js';

it('should plan schema', async () => {
  const supergraph = await fs.readFile(
    path.resolve(__dirname, 'fixtures', 'fusiongraph.graphql'),
    'utf-8',
  );
  expect(
    planSchema(
      buildSchema(supergraph, {
        assumeValid: true,
      }),
    ),
  ).toMatchSnapshot();
});
