import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../utils.js';

interface Manufacturer {
  id: string;
  name: string;
  productUpcs: string[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  manufacturerId: string;
}

interface Store {
  id: string;
  name: string;
  productUpcs: string[];
}

const manufacturers: Manufacturer[] = [
  {
    id: 'samsung',
    name: 'Samsung',
    productUpcs: ['tv', 'galaxy', 'fold'],
  },
  {
    id: 'apple',
    name: 'Apple',
    productUpcs: ['iphone', 'ipad'],
  },
];

const products: Product[] = [
  {
    id: 'tv',
    name: 'Samsung TV',
    price: 5,
    manufacturerId: 'samsung',
  },
  {
    id: 'fold',
    name: 'Samsung Fold',
    price: 10,
    manufacturerId: 'samsung',
  },
  {
    id: 'galaxy',
    name: 'Samsung Galaxy',
    price: 15,
    manufacturerId: 'samsung',
  },
  {
    id: 'iphone',
    name: 'Apple iPhone',
    price: 20,
    manufacturerId: 'apple',
  },
  {
    id: 'ipad',
    name: 'iPad',
    price: 25,
    manufacturerId: 'apple',
  },
];

const stores: Store[] = [
  {
    id: 'apple-store',
    name: 'Apple Store',
    productUpcs: ['iphone', 'ipad'],
  },
  {
    id: 'samsung-store',
    name: 'Samsung',
    productUpcs: ['tv', 'fold', 'galaxy'],
  },
];

export const subgraphs: FixtureSubgraphs = {
  stores: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        store(id: ID!): Store
      }
      type Store {
        id: ID!
        name: String!
        products: [Product]!
      }
      type Product {
        id: ID!
      }
    `,
    resolvers: {
      Query: {
        store: (_parent, args: { id: string }) => {
          const store = stores.find((store) => store.id === args.id);
          if (!store) {
            return null;
          }
          return {
            ...store,
            products: products.filter((product) =>
              store.productUpcs.includes(product.id),
            ),
            productNames: products
              .filter((product) => store.productUpcs.includes(product.id))
              .map((product) => product.name),
          };
        },
      },
    },
  }),
  products: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product(id: ID!): Product
      }
      type Product {
        id: ID!
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
        product: (_parent, args: { id: string }) =>
          products.find((product) => product.id === args.id),
      },
      Product: {
        manufacturer: (product: Product) => {
          const manufacturer = manufacturers.find(
            (manufacturer) => manufacturer.id === product.manufacturerId,
          );
          return manufacturer
            ? {
                ...manufacturer,
                products: products.filter(
                  (product) => product.manufacturerId === manufacturer.id,
                ),
              }
            : null;
        },
      },
    },
  }),
  manufacturers: createSource({
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
        manufacturer: (_parent, args: { id: string }) =>
          manufacturers.find((manufacturer) => manufacturer.id === args.id),
      },
    },
  }),
};
