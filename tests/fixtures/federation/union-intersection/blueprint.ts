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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Media',
            },
            b: {
              subgraph: 'b',
              type: 'Media',
            },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Book',
            },
            b: {
              subgraph: 'b',
              type: 'Media',
            },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Media',
            },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'Viewer',
            },
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
    },
    Media: {
      kind: 'interface',
      name: 'Media',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
      },
    },
    ViewerMedia: {
      kind: 'interface',
      name: 'ViewerMedia',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
      },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
      },
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
          subgraphs: {
            b: {
              subgraph: 'b',
              type: 'String!',
            },
          },
        },
      },
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
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'String!',
            },
          },
        },
      },
    },
    Viewer: {
      kind: 'object',
      name: 'Viewer',
      fields: {
        media: {
          name: 'media',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ViewerMedia',
            },
            b: {
              subgraph: 'b',
              type: 'ViewerMedia',
            },
          },
        },
        book: {
          name: 'book',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ViewerMedia',
            },
            b: {
              subgraph: 'b',
              type: 'Book',
            },
          },
        },
        song: {
          name: 'song',
          subgraphs: {
            a: {
              subgraph: 'a',
              type: 'ViewerMedia',
            },
          },
        },
      },
    },
  },
};
