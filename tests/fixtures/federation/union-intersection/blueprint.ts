import { Blueprint } from '../../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
    type Book {
      title: String!
    }

    union Media = Book | Song | Movie

    type Movie {
      title: String!
    }

    type Query {
      media: Media
      book: Media
      song: Media
      viewer: Viewer
    }

    type Song {
      title: String!
    }

    type Viewer {
      media: ViewerMedia
      book: ViewerMedia
      song: ViewerMedia
    }

    union ViewerMedia = Book | Song | Movie
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      implements: {},
      fields: {
        media: {
          name: 'media',
          subgraphs: ['a', 'b'],
          types: {
            a: 'Media',
            b: 'Media',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: 'Media',
              ofType: 'Media',
              operation: /* GraphQL */ `
                {
                  media {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
            b: {
              subgraph: 'b',
              kind: 'interface',
              type: 'Media',
              ofType: 'Media',
              operation: /* GraphQL */ `
                {
                  media {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        book: {
          name: 'book',
          subgraphs: ['a', 'b'],
          types: {
            a: 'Book',
            b: 'Media',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'object',
              type: 'Book',
              ofType: 'Book',
              operation: /* GraphQL */ `
                {
                  book {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
            b: {
              subgraph: 'b',
              kind: 'interface',
              type: 'Media',
              ofType: 'Media',
              operation: /* GraphQL */ `
                {
                  book {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        song: {
          name: 'song',
          subgraphs: ['a'],
          types: {
            a: 'Media',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: 'Media',
              ofType: 'Media',
              operation: /* GraphQL */ `
                {
                  song {
                    ...__export
                  }
                }
              `,
              variables: {},
            },
          },
        },
        viewer: {
          name: 'viewer',
          subgraphs: ['a'],
          types: {
            a: 'Viewer',
          },
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'object',
              type: 'Viewer',
              ofType: 'Viewer',
              operation: /* GraphQL */ `
                {
                  viewer {
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
    Media: {
      kind: 'interface',
      name: 'Media',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a', 'b'],
          types: {
            a: 'String!',
            b: 'String!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
    ViewerMedia: {
      kind: 'interface',
      name: 'ViewerMedia',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a', 'b'],
          types: {
            a: 'String!',
            b: 'String!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
    Book: {
      kind: 'object',
      name: 'Book',
      implements: {
        Media: {
          name: 'Media',
          subgraphs: ['a', 'b'],
        },
        ViewerMedia: {
          name: 'ViewerMedia',
          subgraphs: ['a', 'b'],
        },
      },
      fields: {
        title: {
          name: 'title',
          subgraphs: ['a', 'b'],
          types: {
            a: 'String!',
            b: 'String!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
    Movie: {
      kind: 'object',
      name: 'Movie',
      implements: {
        Media: {
          name: 'Media',
          subgraphs: ['b'],
        },
        ViewerMedia: {
          name: 'ViewerMedia',
          subgraphs: ['b'],
        },
      },
      fields: {
        title: {
          name: 'title',
          subgraphs: ['b'],
          types: {
            b: 'String!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
    Song: {
      kind: 'object',
      name: 'Song',
      implements: {
        Media: {
          name: 'Media',
          subgraphs: ['a'],
        },
        ViewerMedia: {
          name: 'ViewerMedia',
          subgraphs: ['a'],
        },
      },
      fields: {
        title: {
          name: 'title',
          subgraphs: ['a'],
          types: {
            a: 'String!',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
    Viewer: {
      kind: 'object',
      name: 'Viewer',
      implements: {},
      fields: {
        media: {
          name: 'media',
          subgraphs: ['a', 'b'],
          types: {
            a: 'ViewerMedia',
            b: 'ViewerMedia',
          },
          resolvers: {},
        },
        book: {
          name: 'book',
          // TODO: book field in "b" resolves to Book
          subgraphs: ['a', 'b'],
          types: {
            a: 'ViewerMedia',
            b: 'Book',
          },
          resolvers: {},
        },
        song: {
          name: 'song',
          subgraphs: ['a'],
          types: {
            a: 'ViewerMedia',
          },
          resolvers: {},
        },
      },
      resolvers: {},
    },
  },
};
