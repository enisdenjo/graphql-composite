import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../../utils.js';
import { books } from './data.js';

export const subgraphs: FixtureSubgraphs = {
  a: createSource(
    buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          extend schema
            @link(
              url: "https://specs.apollo.dev/federation/v2.3"
              import: ["@key", "@external", "@provides"]
            )

          type Query {
            product: Product
          }

          interface Product {
            samePriceProduct: Product
          }

          type Book implements Product @key(fields: "id") {
            id: ID!
            samePriceProduct: Book @provides(fields: "price")
            price: Float @external
          }
        `),
        resolvers: {
          Query: {
            product() {
              const book = books[0]!;
              return {
                __typename: book.__typename,
                id: book.id,
                price: book.price,
              };
            },
          },
          Book: {
            samePriceProduct(book: { id: string; price: number }) {
              const samePriceBook = books.find(
                (b) => b.price === book.price && b.id !== book.id,
              );

              if (!samePriceBook) {
                return null;
              }

              return {
                __typename: samePriceBook.__typename,
                id: samePriceBook.id,
                price: samePriceBook.price,
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
              import: ["@key", "@shareable"]
            )

          type Book @key(fields: "id") {
            id: ID!
            price: Float @shareable
          }
        `),
        resolvers: {
          Book: {
            __resolveReference(key: { id: string }) {
              const book = books.find((b) => b.id === key.id);

              if (!book) {
                return null;
              }

              return {
                __typename: book.__typename,
                id: book.id,
                price: book.price,
              };
            },
          },
        },
      },
    ]),
  ),
};
