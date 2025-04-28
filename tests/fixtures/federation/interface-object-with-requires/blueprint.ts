import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    interface NodeWithName {
      id: ID!
      name: String
      username: String
    }

    type Query {
      users: [NodeWithName!]!
      anotherUsers: [NodeWithName]
    }

    type User implements NodeWithName {
      id: ID!
      name: String
      age: Int
      username: String
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      fields: {
        users: {
          name: 'users',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: '[NodeWithName!]!',
            },
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: '[NodeWithName!]!',
              ofType: 'NodeWithName',
              operation: /* GraphQL */ `
                {
                  users {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        anotherUsers: {
          name: 'anotherUsers',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: '[NodeWithName]',
            },
          },
          resolvers: {
            b: {
              subgraph: 'b',
              kind: 'interface',
              type: '[NodeWithName]',
              ofType: 'NodeWithName',
              operation: /* GraphQL */ `
                {
                  anotherUsers {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
      },
    },
    NodeWithName: {
      kind: 'interface',
      name: 'NodeWithName',
      fields: {
        id: {
          name: 'id',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ID!',
            },
            b: {
              subgraph: 'b',
              type: 'ID!',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String',
            },
          },
        },
        username: {
          name: 'username',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String',
            },
          },
          resolvers: {
            b: {
              subgraph: 'b',
              kind: 'interface',
              type: '[NodeWithName]!',
              ofType: 'NodeWithName',
              operation: /* GraphQL */ `
                query ($id: ID!, $name: String!) {
                  _entities(
                    representations: [
                      { __typename: "NodeWithName", id: $id, name: $name }
                    ]
                  ) {
                    ... on NodeWithName {
                      ...__export
                    }
                  }
                }
              `,
              variables: {
                id: {
                  kind: 'select',
                  name: 'id',
                  select: 'id',
                },
                name: {
                  kind: 'select',
                  name: 'name',
                  select: 'name',
                },
              },
            },
          },
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'interface',
            type: '[NodeWithName]!',
            ofType: 'NodeWithName',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "NodeWithName", id: $id }]
                ) {
                  ... on NodeWithName {
                    ...__export
                  }
                }
              }
            `,
            variables: {
              id: {
                kind: 'select',
                name: 'id',
                select: 'id',
              },
            },
          },
        ],
        b: [
          {
            subgraph: 'b',
            kind: 'interface',
            type: '[NodeWithName]!',
            ofType: 'NodeWithName',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "NodeWithName", id: $id }]
                ) {
                  ... on NodeWithName {
                    ...__export
                  }
                }
              }
            `,
            variables: {
              id: {
                kind: 'select',
                name: 'id',
                select: 'id',
              },
            },
          },
        ],
      },
    },
    User: {
      kind: 'object',
      name: 'User',
      implements: {
        NodeWithName: {
          name: 'NodeWithName',
          subgraphs: ['a'],
        },
      },
      fields: {
        id: {
          name: 'id',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ID!',
            },
          },
        },
        name: {
          name: 'name',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String',
            },
          },
        },
        age: {
          name: 'age',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Int',
            },
          },
        },
      },
      resolvers: {
        a: [
          {
            subgraph: 'a',
            kind: 'object',
            type: '[User]!',
            ofType: 'User',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(representations: [{ __typename: "User", id: $id }]) {
                  ... on User {
                    ...__export
                  }
                }
              }
            `,
            variables: {
              id: {
                kind: 'select',
                name: 'id',
                select: 'id',
              },
            },
          },
        ],
      },
    },
  },
};
