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
      fields: {
        feed: {
          name: 'feed',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: '[Post]',
            },
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
          subgraphs: {
            b: {
              subgraph: 'b',
              type: '[AnotherPost]',
            },
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
    },
    Post: {
      name: 'Post',
      kind: 'interface',
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
        createdAt: {
          name: 'createdAt',
          subgraphs: {
            // a: { ... }, field has an @override in subgraph "b"
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
      },
    },
    AnotherPost: {
      name: 'AnotherPost',
      kind: 'interface',
      fields: {
        id: {
          name: 'id',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'ID!',
            },
          },
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
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
        createdAt: {
          name: 'createdAt',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
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
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'ID!',
            },
          },
        },
        createdAt: {
          name: 'createdAt',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
        body: {
          name: 'body',
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
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
