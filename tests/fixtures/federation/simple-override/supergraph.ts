export const supergraph = /* GraphQL */ `
  schema
    @link(url: "https://specs.apollo.dev/link/v1.0")
    @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) {
    query: Query
  }

  directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

  directive @join__field(
    graph: join__Graph
    requires: join__FieldSet
    provides: join__FieldSet
    type: String
    external: Boolean
    override: String
    usedOverridden: Boolean
  ) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

  directive @join__graph(name: String!, url: String!) on ENUM_VALUE

  directive @join__implements(
    graph: join__Graph!
    interface: String!
  ) repeatable on OBJECT | INTERFACE

  directive @join__type(
    graph: join__Graph!
    key: join__FieldSet
    extension: Boolean! = false
    resolvable: Boolean! = true
    isInterfaceObject: Boolean! = false
  ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

  directive @join__unionMember(
    graph: join__Graph!
    member: String!
  ) repeatable on UNION

  directive @link(
    url: String
    as: String
    for: link__Purpose
    import: [link__Import]
  ) repeatable on SCHEMA

  scalar join__FieldSet

  enum join__Graph {
    A
      @join__graph(
        name: "a"
        url: "https://federation-compatibility.the-guild.dev/simple-override/a"
      )
    B
      @join__graph(
        name: "b"
        url: "https://federation-compatibility.the-guild.dev/simple-override/b"
      )
  }

  scalar link__Import

  enum link__Purpose {
    SECURITY
    EXECUTION
  }

  type Post @join__type(graph: A, key: "id") @join__type(graph: B, key: "id") {
    id: ID!
    createdAt: String! @join__field(graph: B, override: "a")
  }

  type Query @join__type(graph: A) @join__type(graph: B) {
    feed: [Post]
    aFeed: [Post] @join__field(graph: A)
    bFeed: [Post] @join__field(graph: B)
  }
`;
