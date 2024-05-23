import fs from 'fs/promises';
import path from 'path';
import { IExecutableSchemaDefinition } from '@graphql-tools/schema';
import { DocumentNode, ExecutionResult } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { Blueprint } from '../src/blueprint.js';

export type FixtureSources = Record<string, Source>;

export type FixtureQueries = {
  name: string;
  document: DocumentNode;
  variables: Record<string, unknown>;
  result: ExecutionResult;
}[];

export interface Fixture {
  name: string;
  blueprint: Blueprint;
  subgraphs: FixtureSources;
  queries: FixtureQueries;
}

export async function getFixture(name: string): Promise<Fixture> {
  const dir = path.join(__dirname, 'fixtures', name);
  const { blueprint } = await import(path.join(dir, 'blueprint.ts'));
  const { subgraphs } = await import(path.join(dir, 'subgraphs.ts'));
  const { queries } = await import(path.join(dir, 'queries.ts'));
  return {
    name,
    blueprint,
    subgraphs,
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
