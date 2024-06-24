import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Query {
      feed: [Post]
      anotherFeed: [AnotherPost]
    }

    interface Post {
      id: ID!
      createdAt: String!
    }

    interface AnotherPost {
      id: ID!
      createdAt: String!
    }

    type ImagePost implements Post & AnotherPost {
      id: ID!
      createdAt: String!
    }

    type TextPost implements Post {
      id: ID!
      createdAt: String!
      body: String!
    }
  `,
  types: {
    Query: {
      name: 'Query',
      kind: 'object',
      implements: {},
      fields: {
        feed: {
          name: 'feed',
          subgraphs: ['a'],
          types: {
            a: '[Post]',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: '[Post]',
              ofType: 'Post',
              operation: /* GraphQL */ `
                {
                  feed {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        anotherFeed: {
          name: 'anotherFeed',
          subgraphs: ['b'],
          types: {
            b: '[AnotherPost]',
          },
          resolvers: {
            a: {
              subgraph: 'b',
              kind: 'interface',
              type: '[AnotherPost]',
              ofType: 'AnotherPost',
              operation: /* GraphQL */ `
                {
                  anotherFeed {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
      },
      resolvers: {},
    },
    Post: {
      name: 'Post',
      kind: 'interface',
      resolvers: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a', 'b'],
          types: {
            a: 'ID!',
            b: 'ID!',
          },
          resolvers: {},
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: [
            // 'a', field has an @override in subgraph "b"
            'b',
          ],
          types: {
            b: 'String!',
          },
          resolvers: {},
        },
      },
    },
    AnotherPost: {
      name: 'AnotherPost',
      kind: 'interface',
      resolvers: {},
      fields: {
        id: {
          name: 'id',
          subgraphs: ['b'],
          types: {
            b: 'ID!',
          },
          resolvers: {},
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: ['b'],
          types: {
            b: 'String!',
          },
          resolvers: {},
        },
      },
    },
    ImagePost: {
      kind: 'object',
      name: 'ImagePost',
      implements: {
        AnotherPost: {
          name: 'AnotherPost',
          subgraphs: ['b'],
        },
        Post: {
          name: 'Post',
          subgraphs: ['a'],
        },
      },
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a', 'b'],
          types: {
            a: 'ID!',
            b: 'ID!',
          },
          resolvers: {},
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: ['b'],
          types: {
            b: 'String!',
          },
          resolvers: {},
        },
      },
      resolvers: {
        b: [
          {
            subgraph: 'b',
            kind: 'object',
            type: '[ImagePost]',
            ofType: 'ImagePost',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "ImagePost", id: $id }]
                ) {
                  ... on ImagePost {
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
    TextPost: {
      kind: 'object',
      name: 'TextPost',
      implements: {
        Post: {
          name: 'Post',
          subgraphs: ['b'],
        },
      },
      fields: {
        id: {
          name: 'id',
          subgraphs: ['b'],
          types: {
            b: 'ID!',
          },
          resolvers: {},
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: ['b'],
          types: {
            b: 'String!',
          },
          resolvers: {},
        },
        body: {
          name: 'body',
          subgraphs: ['b'],
          types: {
            b: 'String!',
          },
          resolvers: {},
        },
      },
      resolvers: {
        b: [
          {
            subgraph: 'b',
            kind: 'object',
            type: '[TextPost]',
            ofType: 'TextPost',
            operation: /* GraphQL */ `
              query ($id: ID!) {
                _entities(
                  representations: [{ __typename: "TextPost", id: $id }]
                ) {
                  ... on TextPost {
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
