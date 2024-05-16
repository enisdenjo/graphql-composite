import { OperationTypeNode } from 'graphql';
import { SchemaPlan } from '../../../../src/schemaPlan.js';

export const schema: SchemaPlan = {
  schema: /* GraphQL */ `
    interface Account {
      id: ID!
      name: String!
      isActive: Boolean!
    }

    type Admin implements Account {
      id: ID!
      isMain: Boolean!
      isActive: Boolean!
      name: String!
    }

    interface NodeWithName {
      id: ID!
      name: String
      username: String
    }

    type Query {
      users: [NodeWithName!]!
      anotherUsers: [NodeWithName]
      accounts: [Account]
    }

    type Regular implements Account {
      id: ID!
      isMain: Boolean!
      name: String!
      isActive: Boolean!
    }

    type User implements NodeWithName {
      id: ID!
      name: String
      age: Int
      username: String
    }
  `,
  operations: {
    query: {
      name: OperationTypeNode.QUERY,
      fields: {
        users: {
          name: 'users',
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
          resolvers: {
            b: {
              subgraph: 'b',
              kind: 'interface',
              type: '[NodeWithName!]!',
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
  },
  types: {
    NodeWithName: {
      kind: 'interface',
      name: 'NodeWithName',
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a', 'b', 'c'],
        },
        name: {
          name: 'name',
          subgraphs: ['a'],
        },
        username: {
          name: 'username',
          subgraphs: ['b'],
        },
      },
      resolvers: {
        a: {
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
        b: {
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
      },
    },
  },
};
