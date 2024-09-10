import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'StoreProductsManufacturerAndItsProducts',
    document: parse(/* GraphQL */ `
      query StoreProductsManufacturerAndItsProducts($id: ID!) {
        store(id: $id) {
          name
          products {
            id
            name
            price
            manufacturer {
              name
              products {
                name
              }
            }
          }
        }
      }
    `),
    variables: {
      id: 'apple-store',
    },
    result: {
      data: {
        store: {
          name: 'Apple Store',
          products: [
            {
              id: 'iphone',
              price: 20,
              manufacturer: {
                name: 'Apple',
                products: [
                  {
                    name: 'Apple iPhone',
                  },
                  {
                    name: 'iPad',
                  },
                ],
              },
              name: 'Apple iPhone',
            },
            {
              id: 'ipad',
              price: 25,
              manufacturer: {
                name: 'Apple',
                products: [
                  {
                    name: 'Apple iPhone',
                  },
                  {
                    name: 'iPad',
                  },
                ],
              },
              name: 'iPad',
            },
          ],
        },
      },
    },
  },
];
