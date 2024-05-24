/**
 * A unique identifier for a graph.
 * It's an enum value from join__Graph enum.
 *
 * Kamil: I used branded types to not mess up GraphID and GraphName
 */
export type GraphID = string & {
  __brand: 'GraphID';
};

/**
 * A unique name for a graph. It's a string value from @join__graph(name: "") directive.
 * It's used also in @join__field(override:).
 */
export type GraphName = string & {
  __brand: 'GraphName';
};
