import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { posts } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  a: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@shareable"]
            )

          type Post @key(fields: "id") {
            id: ID!
            createdAt: String! @shareable
          }

          type Query {
            feed: [Post] @shareable
            aFeed: [Post]
          }
        `),
        resolvers: {
          Query: {
            feed() {
              return posts;
            },
            aFeed() {
              return [posts[1]];
            },
          },
          Post: {
            __resolveReference(key: { id: string }) {
              const post = posts.find((p) => p.id === key.id);

              if (!post) {
                return null;
              }

              return {
                id: post.id,
                createdAt: post.createdAt,
              };
            },
            createdAt() {
              return 'NEVER';
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
              import: ["@key", "@override", "@shareable"]
            )

          type Post @key(fields: "id") {
            id: ID!
            createdAt: String! @override(from: "a") @shareable
          }

          type Query {
            feed: [Post] @shareable
            bFeed: [Post]
          }
        `),
        resolvers: {
          Query: {
            feed() {
              return posts;
            },
            bFeed() {
              return [posts[0]];
            },
          },
          Post: {
            __resolveReference(key: { id: string }) {
              const post = posts.find((p) => p.id === key.id);

              if (!post) {
                return null;
              }

              return {
                id: post.id,
                createdAt: post.createdAt,
              };
            },
          },
        },
      },
    ]),
  ),
};
