import fs from 'fs/promises';
import path from 'path';
import { IExecutableSchemaDefinition } from '@graphql-tools/schema';
import { DocumentNode, ExecutionResult, GraphQLSchema } from 'graphql';
import { createSchema, createYoga, YogaServerInstance } from 'graphql-yoga';
import { SchemaPlan } from '../src/schemaPlan.js';

export type FixtureSources = Record<string, Source>;

export type FixtureQueries = {
  name: string;
  document: DocumentNode;
  variables: Record<string, unknown>;
  result: ExecutionResult;
}[];

export interface Fixture {
  name: string;
  schema: SchemaPlan;
  subgraphs: FixtureSources;
  queries: FixtureQueries;
}

export async function getFixture(name: string): Promise<Fixture> {
  const dir = path.join(__dirname, 'fixtures', name);
  const { schema } = await import(path.join(dir, 'schema.ts'));
  const { subgraphs } = await import(path.join(dir, 'subgraphs.ts'));
  const { queries } = await import(path.join(dir, 'queries.ts'));
  return {
    name,
    schema,
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
  yoga: YogaServerInstance<any, any>;
  fetch: typeof fetch;
}

export function createSource(
  defOrSchema: IExecutableSchemaDefinition | GraphQLSchema,
): Source {
  const yoga = createYoga({
    maskedErrors: false,
    schema:
      defOrSchema instanceof GraphQLSchema
        ? defOrSchema
        : createSchema(defOrSchema),
  });
  return {
    yoga,
    // @ts-expect-error TODO: yoga's `fetch` types dont match the native fetch types.
    fetch: yoga.fetch,
  };
}
