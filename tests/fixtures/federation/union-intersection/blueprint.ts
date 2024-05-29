import { OperationTypeNode } from 'graphql';
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
  operations: {
    query: {
      name: OperationTypeNode.QUERY,
      fields: {
        media: {
          name: 'media',
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: 'Media',
              ofType: 'Media',
              resolvableTypes: ['Book'],
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
              resolvableTypes: ['Book'],
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
              resolvableTypes: ['Book'],
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
          resolvers: {
            a: {
              subgraph: 'a',
              kind: 'interface',
              type: 'Media',
              ofType: 'Media',
              resolvableTypes: ['Book', 'Song'],
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
  },
  types: {
    Media: {
      kind: 'interface',
      name: 'Media',
      fields: {
        __typename: {
          name: '__typename',
          subgraphs: ['a', 'b'],
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
        },
      },
      resolvers: {},
    },
    Book: {
      kind: 'object',
      name: 'Book',
      implements: ['Media', 'ViewerMedia'],
      fields: {
        title: {
          name: 'title',
          subgraphs: ['a', 'b'],
        },
      },
      resolvers: {},
    },
    Movie: {
      kind: 'object',
      name: 'Movie',
      implements: ['Media', 'ViewerMedia'],
      fields: {
        title: {
          name: 'title',
          subgraphs: ['b'],
        },
      },
      resolvers: {},
    },
    Song: {
      kind: 'object',
      name: 'Song',
      implements: ['Media', 'ViewerMedia'],
      fields: {
        title: {
          name: 'title',
          subgraphs: ['a'],
        },
      },
      resolvers: {},
    },
    Viewer: {
      kind: 'object',
      name: 'Viewer',
      implements: [],
      fields: {
        media: {
          name: 'media',
          subgraphs: ['a', 'b'],
        },
        book: {
          name: 'book',
          // TODO: book field in "b" resolves to Book
          subgraphs: ['a', 'b'],
        },
        song: {
          name: 'song',
          subgraphs: ['a'],
        },
      },
      resolvers: {},
    },
  },
};
