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
    }

    type Song {
      title: String!
    }
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
    Book: {
      kind: 'object',
      name: 'Book',
      implements: ['Media'],
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
      implements: ['Media'],
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
      implements: ['Media'],
      fields: {
        title: {
          name: 'title',
          subgraphs: ['a'],
        },
      },
      resolvers: {},
    },
  },
};
