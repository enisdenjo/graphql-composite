export function isRecord(val: unknown): val is Record<string, unknown> {
  return val != null && typeof val === 'object' && !Array.isArray(val);
}

// TODO: test
export function expandPathsToQuery(paths: string[]): string {
  let query = '';
  query += paths[0] + ' ';
  if (paths.length > 1) {
    query += '{ ';
    query += expandPathsToQuery(paths.slice(1));
    query += '}';
    return query;
  }
  return query;
}
