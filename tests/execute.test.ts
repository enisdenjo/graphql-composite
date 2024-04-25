import fs from 'fs';
import path from 'path';
import { buildSchema, parse } from 'graphql';
import { createSchema, createYoga, YogaServerInstance } from 'graphql-yoga';
import { expect, it } from 'vitest';
import { buildResolverQuery, execute } from '../src/execute.js';
import { planGather } from '../src/gather.js';

const schema = buildSchema(
  fs.readFileSync(
    path.resolve(__dirname, 'fixtures', 'fusiongraph.graphql'),
    'utf-8',
  ),
  { assumeValid: true },
);

const document = parse(/* GraphQL */ `
  {
    storefront(id: "2") {
      id
      name
      products {
        upc
        name
        manufacturer {
          products {
            upc
            name
          }
          name
        }
      }
    }
  }
`);

it('should execute', async () => {
  const sources: Record<string, YogaServerInstance<any, any>> = {
    storefronts: createYoga({
      maskedErrors: false,
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            storefront(id: ID!): Storefront
          }
          type Storefront {
            id: ID!
            name: String!
            products: [Product]!
          }
          type Product {
            upc: ID!
          }
        `,
        resolvers: {
          Query: {
            storefront: () => ({
              id: 'cyberport',
              name: 'CyberPort',
              products: [
                {
                  upc: 'laptop',
                },
                {
                  upc: 'computer',
                },
                {
                  upc: 'headset',
                },
              ],
            }),
          },
        },
      }),
    }),
    products: createYoga({
      maskedErrors: false,
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            product(upc: ID!): Product
          }
          type Product {
            upc: ID!
            name: String!
            price: Float!
            manufacturer: Manufacturer
          }
          type Manufacturer {
            id: ID!
            products: [Product]!
          }
        `,
        resolvers: {
          Query: {
            product: (_parent, args: { upc: string }) => ({
              upc: args.upc,
              name: `TODO: name of product ${args.upc}`,
              price: `TODO: price of product ${args.upc}`,
              manufacturer: {
                id: `manufacturer-of-${args.upc}`,
                products: [
                  {
                    upc: args.upc,
                    name: `TODO: name of product ${args.upc}`,
                    price: `TODO: price of product ${args.upc}`,
                  },
                  {
                    upc: 'otherthing',
                    name: 'TODO: name of product otherthing',
                    price: 'TODO: price of product otherthing',
                  },
                ],
              },
            }),
          },
        },
      }),
    }),
    manufacturers: createYoga({
      maskedErrors: false,
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            manufacturer(id: ID!): Manufacturer
          }
          type Manufacturer {
            id: ID!
            name: String!
          }
        `,
        resolvers: {
          Query: {
            manufacturer: (_parent, args: { id: string }) => ({
              id: args.id,
              name: `TODO: name of manufacturer ${args.id}`,
            }),
          },
        },
      }),
    }),
  };

  await expect(
    execute(
      {
        getFetch(sourceId) {
          const yoga = sources[sourceId];
          if (!yoga) {
            throw new Error(`Unsupported source "${sourceId}"`);
          }
          return (url, init) => {
            expect(init?.body).toMatchSnapshot(sourceId);
            return yoga.fetch(
              // @ts-expect-error TODO: yoga's fetch url type doesnt fit the native fetch url type
              url,
              init,
            ) as any; // TODO: not even the return type of yoga's fetch matches native fetch
          };
        },
      },
      planGather(schema, document),
      { id: '' }, // TODO: support inline variables too
    ),
  ).resolves.toMatchSnapshot();
});

it.each([
  {
    id: 'storefronts',
    type: 'Storefront',
    operation:
      'query storefront($id: ID!) { storefront(id: $id) { ...export } }',
    exports: ['id', 'name', 'products.upc'],
  },
  {
    id: 'products',
    type: 'Product',
    operation:
      'query ProductByUpc($Product_upc: ID!) { product(upc: $Product_upc) { ...export } }',
    exports: [
      'name',
      'manufacturer.products.upc',
      'manufacturer.products.name',
      'manufacturer.id',
    ],
  },
  {
    id: 'manufacturers',
    type: 'Manufacturer',
    operation:
      'query ManufacturerById($Manufacturer_id: ID!) { manufacturer(id: $Manufacturer_id) { ...export } }',
    exports: ['name'],
  },
])('should build proper query for $id resolver', (resolver) => {
  expect(buildResolverQuery(resolver)).toMatchSnapshot();
});
