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
      implements: [],
      fields: {
        feed: {
          name: 'feed',
          subgraphs: ['a'],
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
          resolvers: {},
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: ['a', 'b'],
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
          resolvers: {},
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: ['b'],
          resolvers: {},
        },
      },
    },
    ImagePost: {
      kind: 'object',
      name: 'ImagePost',
      implements: ['AnotherPost', 'Post'],
      fields: {
        id: {
          name: 'id',
          subgraphs: ['a', 'b'],
          resolvers: {},
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: ['b'],
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
      implements: ['Post'],
      fields: {
        id: {
          name: 'id',
          subgraphs: ['b'],
          resolvers: {},
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: ['b'],
          resolvers: {},
        },
        body: {
          name: 'body',
          subgraphs: ['b'],
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
