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
  upc: string;
  name: string;
  price: number;
  manufacturerId: string;
}

interface Storefront {
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
    upc: 'tv',
    name: 'Samsung TV',
    price: 5,
    manufacturerId: 'samsung',
  },
  {
    upc: 'fold',
    name: 'Samsung Fold',
    price: 10,
    manufacturerId: 'samsung',
  },
  {
    upc: 'galaxy',
    name: 'Samsung Galaxy',
    price: 15,
    manufacturerId: 'samsung',
  },
  {
    upc: 'iphone',
    name: 'Apple iPhone',
    price: 20,
    manufacturerId: 'apple',
  },
  {
    upc: 'ipad',
    name: 'iPad',
    price: 25,
    manufacturerId: 'apple',
  },
];

const storefronts: Storefront[] = [
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
  storefronts: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        storefront(id: ID!): Storefront
        product(upc: ID!): Product
      }
      type Storefront {
        id: ID!
        name: String!
        products: [Product]!
        productNames: [String!]!
      }
      type Product {
        upc: ID!
      }
    `,
    resolvers: {
      Query: {
        storefront: (_parent, args: { id: string }) => {
          const storefront = storefronts.find(
            (storefront) => storefront.id === args.id,
          );
          if (!storefront) {
            return null;
          }
          return {
            ...storefront,
            products: products.filter((product) =>
              storefront.productUpcs.includes(product.upc),
            ),
            productNames: products
              .filter((product) => storefront.productUpcs.includes(product.upc))
              .map((product) => product.name),
          };
        },
        product: (_parent, args: { upc: string }) =>
          products.find((product) => product.upc === args.upc),
      },
    },
  }),
  products: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        product(upc: ID!): Product
        productsByUpcs(upcs: [ID!]!): [Product]!
        productNames: [String!]!
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
        product: (_parent, args: { upc: string }) =>
          products.find((product) => product.upc === args.upc),
        productsByUpcs: (_parent, args: { upcs: string[] }) =>
          products.filter((product) => args.upcs.includes(product.upc)),
        productNames: () => products.map((product) => product.name),
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
        manufacturerName(id: ID!): String
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
        manufacturerName: (_parent, args: { id: string }) =>
          manufacturers.find((manufacturer) => manufacturer.id === args.id)
            ?.name,
      },
    },
  }),
};
