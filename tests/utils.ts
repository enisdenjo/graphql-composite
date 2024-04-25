import fs from 'fs/promises';
import path from 'path';
import { IExecutableSchemaDefinition } from '@graphql-tools/schema';
import { DocumentNode } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';

export type FixtureSources = Record<string, Source>;

export type FixtureQueries = {
  name: string;
  document: DocumentNode;
  variables: Record<string, unknown>;
}[];

export interface Fixture {
  name: string;
  fusiongraph: string;
  sources: FixtureSources;
  queries: FixtureQueries;
}

export async function getFixture(name: string): Promise<Fixture> {
  const dir = path.join(__dirname, 'fixtures', name);
  const fusiongraph = await fs.readFile(
    path.join(dir, 'fusiongraph.graphql'),
    'utf-8',
  );
  const { sources } = await import(path.join(dir, 'sources.ts'));
  const { queries } = await import(path.join(dir, 'queries.ts'));
  return {
    name,
    fusiongraph,
    sources,
    queries,
  };
}

export async function getFixtures(): Promise<Fixture[]> {
  const fixtures: Fixture[] = [];
  for (const name of await fs.readdir(path.join(__dirname, 'fixtures'))) {
    fixtures.push(await getFixture(name));
  }
  return fixtures;
}

export interface Source {
  fetch: typeof fetch;
}

export function createSource(def: IExecutableSchemaDefinition): Source {
  const { fetch } = createYoga({
    maskedErrors: false,
    schema: createSchema(def),
  });
  return {
    // @ts-expect-error TODO: yoga's `fetch` types dont match the native fetch types.
    fetch: fetch,
  };
}
