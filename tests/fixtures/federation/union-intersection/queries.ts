import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'MediaTypename',
    document: parse(/* GraphQL */ `
      query MediaTypename {
        media {
          __typename
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {
          __typename: 'Book',
        },
      },
    },
  },
  {
    name: 'MediaBook',
    document: parse(/* GraphQL */ `
      query MediaBook {
        media {
          ... on Book {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {
          title: 'The Lord of the Rings',
        },
      },
    },
  },
  {
    name: 'MediaMovie',
    document: parse(/* GraphQL */ `
      query MediaMovie {
        media {
          ... on Movie {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {},
      },
    },
  },
  {
    name: 'MediaBookMovie',
    document: parse(/* GraphQL */ `
      query MediaBookMovie {
        media {
          ... on Book {
            title
          }
          ... on Movie {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {
          title: 'The Lord of the Rings',
        },
      },
    },
  },
  {
    name: 'BookAll',
    document: parse(/* GraphQL */ `
      query BookAll {
        book {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
          ... on Book {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        book: {
          __typename: 'Book',
          title: 'The Lord of the Rings',
        },
      },
    },
  },
  {
    name: 'MediaAll',
    document: parse(/* GraphQL */ `
      query MediaAll {
        media {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
          ... on Book {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {
          __typename: 'Book',
          title: 'The Lord of the Rings',
        },
      },
    },
  },
  {
    name: 'AllMedia',
    document: parse(/* GraphQL */ `
      query AllMedia {
        media {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
          ... on Book {
            title
          }
        }
        book {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
          ... on Book {
            title
          }
        }
        song {
          __typename
          ... on Song {
            title
          }
          ... on Movie {
            title
          }
          ... on Book {
            title
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        media: {
          __typename: 'Book',
          title: 'The Lord of the Rings',
        },
        book: {
          __typename: 'Book',
          title: 'The Lord of the Rings',
        },
        song: {
          __typename: 'Song',
          title: 'Song Title',
        },
      },
    },
  },
  {
    name: 'ViewerMediaAll',
    document: parse(/* GraphQL */ `
      query ViewerMediaAll {
        viewer {
          media {
            __typename
            ... on Book {
              title
            }
            ... on Song {
              title
            }
            ... on Movie {
              title
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        viewer: {
          media: {
            __typename: 'Book',
            title: 'The Lord of the Rings',
          },
        },
      },
    },
  },
  {
    name: 'ViewerAllAll',
    document: parse(/* GraphQL */ `
      query ViewerMediaAll {
        viewer {
          media {
            __typename
            ... on Song {
              title
            }
            ... on Movie {
              title
            }
            ... on Book {
              title
            }
          }
          book {
            __typename
            ... on Song {
              title
            }
            ... on Movie {
              title
            }
            ... on Book {
              title
            }
          }
          song {
            __typename
            ... on Song {
              title
            }
            ... on Movie {
              title
            }
            ... on Book {
              title
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        viewer: {
          media: {
            __typename: 'Book',
            title: 'The Lord of the Rings',
          },
          book: {
            __typename: 'Book',
            title: 'The Lord of the Rings',
          },
          song: {
            __typename: 'Song',
            title: 'Song Title',
          },
        },
      },
    },
  },
  {
    name: 'ViewerMediaMovie',
    document: parse(/* GraphQL */ `
      query ViewerMediaMovie {
        viewer {
          media {
            ... on Movie {
              title
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        viewer: {
          media: {},
        },
      },
    },
  },
  {
    name: 'Aliases',
    document: parse(/* GraphQL */ `
      query Aliases {
        v: viewer {
          m: media {
            __typename
            ... on Song {
              songTitle: title
              title
            }
            ... on Movie {
              movieTitle: title
              title
            }
            ... on Book {
              bookTitle: title
              bookTitle2: title
              title
            }
          }
          b: book {
            type: __typename
            ... on Song {
              songTitle: title
            }
            ... on Movie {
              movieTitle: title
            }
            ... on Book {
              bookTitle: title
            }
          }
          s: song {
            __typename
            ... on Song {
              # FIXME songTypename: __typename  - this will break the test
              songTitle: title
            }
            ... on Movie {
              # movieTypename: __typename
              movieTitle: title
            }
            ... on Book {
              # bookTypename: __typename
              bookTitle: title
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        v: {
          m: {
            __typename: 'Book',
            bookTitle: 'The Lord of the Rings',
            bookTitle2: 'The Lord of the Rings',
            title: 'The Lord of the Rings',
          },
          b: {
            type: 'Book',
            bookTitle: 'The Lord of the Rings',
          },
          s: {
            __typename: 'Song',
            songTitle: 'Song Title',
          },
        },
      },
    },
  },
];
