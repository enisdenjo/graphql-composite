#!/usr/bin/env node --import tsx
import { createServer } from 'http';
import { getFixture } from '../utils.js';

const fixtureName = process.argv[2];
if (!fixtureName) {
  throw new Error('Required argument for fixture name not provided');
}

const fixture = await getFixture(fixtureName);

const subgraphs = Object.entries(fixture.subgraphs);

for (let i = 0; i < subgraphs.length; i++) {
  const [name, subgraph] = subgraphs[i]!;
  const port = 50000 + i;
  createServer(
    // @ts-expect-error yoga doenst fit the createServer argument signature
    subgraph.yoga,
  ).listen(port);
  console.log(
    `Subgraph "${name}" listening on http://localhost:${port}/graphql`,
  );
}
