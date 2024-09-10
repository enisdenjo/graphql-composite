import { parse } from 'graphql';
import { FixtureQueries } from '../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'AllProductsReviews',
    document: parse(/* GraphQL */ `
      query AllProductsReviews {
        allProducts {
          name
          price
          reviews {
            rating
            user {
              name
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        allProducts: [
          {
            name: 'Samsung TV',
            price: 5,
            reviews: [{ rating: 10, user: { name: 'John' } }],
          },
          { name: 'Samsung Fold', price: 10, reviews: [] },
          { name: 'Samsung Galaxy', price: 15, reviews: [] },
          {
            name: 'Apple iPhone',
            price: 20,
            reviews: [{ rating: 8, user: { name: 'Jane' } }],
          },
          {
            name: 'Apple iPad',
            price: 30,
            reviews: [{ rating: 4, user: { name: 'Jane' } }],
          },
        ],
      },
    },
  },
];
