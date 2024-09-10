import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../utils.js';

interface Product {
  id: string;
  name: string;
  price: number;
}

const products: Product[] = [
  {
    id: 'stv',
    name: 'Samsung TV',
    price: 5,
  },
  {
    id: 'sfold',
    name: 'Samsung Fold',
    price: 10,
  },
  {
    id: 'sgalaxy',
    name: 'Samsung Galaxy',
    price: 15,
  },
  {
    id: 'iphone',
    name: 'Apple iPhone',
    price: 20,
  },
  {
    id: 'ipad',
    name: 'Apple iPad',
    price: 30,
  },
];

interface User {
  id: string;
  name: string;
}

interface Order {
  id: string;
  status: 'pending' | 'delivered';
  userId: string;
  productIds: string[];
}

const users: User[] = [
  {
    id: 'john',
    name: 'John',
  },
  {
    id: 'jane',
    name: 'Jane',
  },
];

const orders: Order[] = [
  {
    id: 'john-o-1',
    status: 'delivered',
    userId: 'john',
    productIds: ['stv'],
  },
  {
    id: 'john-o-1',
    status: 'pending',
    userId: 'john',
    productIds: ['sfold', 'sgalaxy'],
  },
  {
    id: 'jane-o-2',
    status: 'delivered',
    userId: 'jane',
    productIds: ['iphone', 'ipad'],
  },
];

interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
}

const reviews: Review[] = [
  {
    id: 'john-r-1',
    userId: 'john',
    productId: 'stv',
    rating: 10,
  },
  {
    id: 'jane-r-2',
    userId: 'jane',
    productId: 'iphone',
    rating: 8,
  },
  {
    id: 'jane-r-3',
    userId: 'jane',
    productId: 'ipad',
    rating: 4,
  },
];

export const subgraphs: FixtureSubgraphs = {
  products: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        allProducts: [Product!]!
        product(id: ID!): Product
      }
      type Product {
        id: ID!
        name: String!
        price: Float!
      }
    `,
    resolvers: {
      Query: {
        allProducts: () => products,
        product: (_parent, args: { id: string }) =>
          products.find((product) => product.id === args.id) || null,
      },
    },
  }),
  users: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        user(id: ID!): User
      }
      type User {
        id: ID!
        name: String!
        orders: [Order!]!
      }
      enum OrderStatus {
        pending
        delivered
      }
      type Order {
        id: ID!
        status: OrderStatus!
        products: [Product!]!
      }
      type Product {
        id: ID!
      }
    `,
    resolvers: {
      Query: {
        user: (_parent, args: { id: string }) =>
          users.find((user) => user.id === args.id) || null,
      },
      User: {
        orders: (parent: User) =>
          orders
            .filter((order) => order.userId === parent.id)
            .map(({ productIds, ...order }) => ({
              ...order,
              products: productIds.map((productId) => ({ id: productId })),
            })),
      },
    },
  }),
  reviews: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product(id: ID!): Product
      }
      type Review {
        id: ID!
        rating: Int!
        user: User!
        product: Product!
      }
      type Product {
        id: ID!
        reviews: [Review!]!
      }
      type User {
        id: ID!
      }
    `,
    resolvers: {
      Query: {
        product: (_parent, args: { id: string }) =>
          products.find((product) => product.id === args.id) || null,
      },
      Product: {
        reviews: (parent: Product) =>
          reviews.filter((review) => review.productId === parent.id),
      },
      Review: {
        user: (parent: Review) =>
          users.find((user) => user.id === parent.userId) || null,
        product: (parent: Review) =>
          products.find((product) => product.id === parent.productId) || null,
      },
    },
  }),
};
