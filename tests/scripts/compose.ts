#!/usr/bin/env node --import tsx
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { getFixture } from '../utils.js';

const fixtureName = process.argv[2];
if (!fixtureName) {
  throw new Error('Required argument for fixture name not provided');
}

const fixture = await getFixture(fixtureName);

const subgraphs: {
  name: string;
  port: number;
  url: string;
  server: Server;
}[] = [];
for (const [name, subgraph] of Object.entries(fixture.subgraphs)) {
  const server = createServer(subgraph.yoga).listen();
  const port = (server.address() as AddressInfo).port;
  const url = `http://localhost:${port}/graphql`;
  process.stderr.write(`Subgraph "${name}" listening on ${url}\n`);
  subgraphs.push({ name, port, url, server });
}

process.stderr.write('Composing...\n');

const compose = new IntrospectAndCompose({ subgraphs });
const initialized = await compose.initialize({
  getDataSource(opts) {
    return new RemoteGraphQLDataSource(opts);
  },
  update() {
    // noop
  },
  healthCheck: () => Promise.resolve(),
});

process.stdout.write(initialized.supergraphSdl + '\n');
subgraphs.forEach(({ server }) => {
  server.close();
});
initialized.cleanup();

process.stderr.write('OK\n');
