import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { imagePosts, textPosts } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  a: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key"]
            )

          interface Post {
            id: ID!
            createdAt: String!
          }

          type ImagePost implements Post @key(fields: "id") {
            id: ID!
            createdAt: String!
          }

          type Query {
            feed: [Post]
          }
        `),
        resolvers: {
          Query: {
            feed() {
              return imagePosts;
            },
          },
          ImagePost: {
            __resolveReference(key: { id: string }) {
              const post = imagePosts.find((p) => p.id === key.id);

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
              import: ["@key", "@shareable", "@override"]
            )

          interface Post {
            id: ID!
            createdAt: String!
          }

          type TextPost implements Post @key(fields: "id") {
            id: ID!
            createdAt: String!
            body: String!
          }

          interface AnotherPost {
            id: ID!
            createdAt: String!
          }

          type ImagePost implements AnotherPost @key(fields: "id") {
            id: ID!
            createdAt: String! @override(from: "a")
          }

          type Query {
            anotherFeed: [AnotherPost]
          }
        `),
        resolvers: {
          Query: {
            anotherFeed() {
              return imagePosts;
            },
          },
          TextPost: {
            __resolveReference(key: { id: string }) {
              const post = textPosts.find((p) => p.id === key.id);

              if (!post) {
                return null;
              }

              return {
                id: post.id,
                createdAt: post.createdAt,
                body: post.body,
              };
            },
          },
          ImagePost: {
            __resolveReference(key: { id: string }) {
              const post = imagePosts.find((p) => p.id === key.id);

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
