import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { IExecutableSchemaDefinition } from '@graphql-tools/schema';
import { DocumentNode, ExecutionResult, GraphQLSchema } from 'graphql';
import { createSchema, createYoga, YogaServerInstance } from 'graphql-yoga';
import { Blueprint } from '../src/blueprint.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const paths = await getFixtureNames(path.join(__dirname, 'fixtures'), '');
  return Promise.all(paths.map((p) => getFixture(p)));
}

async function getFixtureNames(dir: string, prefix: string): Promise<string[]> {
  const names: string[] = [];
  for (const name of await fs.readdir(dir)) {
    const hasBlueprint = await fs
      .stat(path.join(dir, name, 'blueprint.ts'))
      .then(() => true)
      .catch(() => false);
    if (hasBlueprint) {
      names.push(prefix + name);
    } else {
      names.push(
        ...(await getFixtureNames(
          path.join(path.join(dir, name)),
          `${prefix + name}/`,
        )),
      );
    }
  }
  return names;
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
    schema: 'typeDefs' in defOrSchema ? createSchema(defOrSchema) : defOrSchema,
  });
  return {
    yoga,
    // @ts-expect-error TODO: yoga's `fetch` types dont match the native fetch types.
    fetch: yoga.fetch,
  };
}
