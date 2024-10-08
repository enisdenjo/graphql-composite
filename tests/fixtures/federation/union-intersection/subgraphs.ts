import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { media } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  a: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@shareable"]
            )

          union Media = Book | Song
          union ViewerMedia = Book | Song

          type Book {
            title: String! @shareable
          }

          type Song {
            title: String! @shareable
          }

          type Query {
            media: Media @shareable
            book: Book @shareable
            song: Media @shareable
            viewer: Viewer @shareable
          }

          type Viewer {
            media: ViewerMedia @shareable
            book: Book @shareable
            song: ViewerMedia @shareable
          }
        `),
        resolvers: {
          Query: {
            media: () => media,
            book: () => media,
            song: () => {
              return {
                __typename: 'Song',
                title: 'Song Title',
              };
            },
            viewer: () => {
              return {
                media: media,
                book: media,
                song: {
                  __typename: 'Song',
                  title: 'Song Title',
                },
              };
            },
          },
        },
      },
    ]),
  ),
  b: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@shareable"]
            )

          type Query {
            media: Media @shareable
            book: Media @shareable
            viewer: Viewer @shareable
          }

          union Media = Book | Movie
          union ViewerMedia = Book | Movie

          type Movie {
            title: String! @shareable
          }

          type Book {
            title: String! @shareable
          }

          type Viewer {
            media: ViewerMedia @shareable
            book: ViewerMedia @shareable
          }
        `),
        resolvers: {
          Query: {
            media: () => media,
            book: () => media,
            viewer: () => {
              return {
                media,
                book: media,
              };
            },
          },
        },
      },
    ]),
  ),
};
