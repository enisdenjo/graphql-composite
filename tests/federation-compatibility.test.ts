import { parse } from 'graphql';
import { describe, expect, it } from 'vitest';
import { Blueprint } from '../src/blueprint.js';
import { execute } from '../src/execute.js';
import {
  buildBlueprintFromFederation,
  readSubgraphs,
} from '../src/federation/blueprint.js';
import { planGather } from '../src/gather.js';
import { TransportHTTP } from '../src/transport.js';

const ids: string[] = [
  // 'abstract-types', // ❌
  // 'circular-reference-interface', // ❌
  // 'complex-entity-call', // ❌
  // 'corrupted-supergraph-node-id', // ❌
  // 'entity-and-no-entity', // ❌
  // 'enum-intersection', // ❌
  // 'fed1-external-extends', // ✅
  // 'fed1-external-extends-resolvable', // ✅
  // 'fed1-external-extension', // ✅
  // 'fed2-external-extends', // ✅
  // 'fed2-external-extension', // ✅
  // 'include-skip', // ❌
  // 'input-object-intersection', // ❌
  // 'interface-object-with-requires', // ❌
  // 'mutations', // ❌
  // 'mysterious-external', // ✅
  // 'nested-provides', // ❌
  // 'non-resolvable-interface-object', // ❌
  // 'override-type-interface', // ❌
  // 'override-with-requires', // ❌
  // 'parent-entity-call', // ❌
  // 'parent-entity-call-complex', // ❌
  // 'provides-on-interface', // ❌
  // 'provides-on-union', // ❌
  // 'requires-interface', // ❌
  // 'requires-requires', // ❌
  // 'requires-with-fragments', // ❌
  // 'shared-root', // ❌
  // 'simple-entity-call', // ✅
  // 'simple-inaccessible', // 🚧
  // 'simple-interface-object', // 🚧
  // 'simple-override', // ✅
  // 'simple-requires-provides', // ❌
  // 'typename', // ✅
  // 'unavailable-override', // ✅
  // 'union-interface-distributed', // 🚧
  // 'union-intersection', // ✅
];

if (ids.length === 0) {
  it.skip('no tests to run');
}

describe.concurrent.each(ids)(`federation-compatibility/%s`, async (id) => {
  const BASE_URL = 'https://federation-compatibility.the-guild.dev';
  const supergraph = await fetch(`${BASE_URL}/${id}/supergraph`).then((r) =>
    r.text(),
  );
  const tests: Array<{
    query: string;
    expected: {
      data: unknown;
      errors?: true;
    };
  }> = await fetch(`${BASE_URL}/${id}/tests`).then((r) => r.json());
  const supergraphDoc = parse(supergraph);
  const subgraphs = readSubgraphs(supergraphDoc);
  let blueprint: Blueprint;

  it('builds blueprint', () => {
    blueprint = buildBlueprintFromFederation(supergraphDoc);
  });

  it.concurrent.each(tests)(`%#`, async ({ query, expected }) => {
    const response = await execute(
      subgraphs.reduce(
        (agg, [name, url]) => ({
          ...agg,
          [name]: new TransportHTTP((_url, init) => {
            return fetch(url, init);
          }),
        }),
        {},
      ),
      planGather(blueprint, parse(query)),
      {},
    );

    expect({
      data: response.data,
      errors: response.errors?.length ? true : undefined,
    }).toStrictEqual({
      data: expected.data,
      errors: expected.errors,
    });
  });
});
