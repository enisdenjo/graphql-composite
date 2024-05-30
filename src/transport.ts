import { ExecutionResult } from 'graphql';

export interface Transport {
  get(args: TransportGetArgs): Promise<ExecutionResult>;
}

export interface TransportGetArgs {
  query: string;
  variables: Record<string, unknown>;
}

export class TransportHTTP implements Transport {
  constructor(private fetch: typeof globalThis.fetch) {}
  async get({ query, variables }: TransportGetArgs): Promise<ExecutionResult> {
    const res = await this.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });
    if (!res.ok) {
      const err = new Error(
        `${res.status} ${res.statusText}\n${await res.text()}\nQuery:${query}\nVariables:${JSON.stringify(variables)}`,
      );
      err.name = 'ResponseError';
      throw err;
    }
    return await res.json();
  }
}
