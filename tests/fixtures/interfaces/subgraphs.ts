import {
  createSource,
  FixtureSources as FixtureSubgraphs,
} from '../../utils.js';

interface Animal {
  name: string;
  type: 'dog' | 'cat';
}

interface Dog extends Animal {
  __typename: 'Dog';
  type: 'dog';
  barks: true;
}

interface Cat extends Animal {
  __typename: 'Cat';
  type: 'cat';
  meows: true;
}

const dogs: Dog[] = [
  {
    __typename: 'Dog',
    name: 'Dogeth',
    type: 'dog',
    barks: true,
  },
  {
    __typename: 'Dog',
    name: 'Dogster',
    type: 'dog',
    barks: true,
  },
];

const cats: Cat[] = [
  {
    __typename: 'Cat',
    name: 'Cathew',
    type: 'cat',
    meows: true,
  },
  {
    __typename: 'Cat',
    name: 'Cathrin',
    type: 'cat',
    meows: true,
  },
];

export const subgraphs: FixtureSubgraphs = {
  shelter: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        animal(name: ID!): Animal
      }
      interface Animal {
        name: ID!
        type: String!
        bestFriend: Animal
      }
      type Dog implements Animal {
        name: ID!
        type: String!
        bestFriend: Animal
        barks: Boolean!
      }
      type Cat implements Animal {
        name: ID!
        type: String!
        bestFriend: Animal
        meows: Boolean!
      }
    `,
    resolvers: {
      Query: {
        animal: (_parent, args: { name: string }) =>
          [...cats, ...dogs].find((animal) => animal.name === args.name),
      },
      Animal: {
        bestFriend: ({ name }: Animal) =>
          name === 'Cathew'
            ? dogs.find((d) => d.name === 'Dogeth')
            : cats.find((c) => c.name === 'Cathew'),
      },
    },
  }),
  store: createSource({
    typeDefs: /* GraphQL */ `
      type Query {
        animal(name: ID!): Animal
      }
      interface Animal {
        name: ID!
        type: String!
        bestFriend: Animal
      }
      type Dog implements Animal {
        name: ID!
        type: String!
        bestFriend: Animal
        barks: Boolean!
      }
      type Cat implements Animal {
        name: ID!
        type: String!
        bestFriend: Animal
        meows: Boolean!
      }
    `,
    resolvers: {
      Query: {
        animal: (_parent, args: { name: string }) =>
          [...cats, ...dogs].find((animal) => animal.name === args.name),
      },
      Animal: {
        bestFriend: ({ name }: Animal) =>
          name === 'Cathew'
            ? dogs.find((d) => d.name === 'Dogeth')
            : cats.find((c) => c.name === 'Cathew'),
      },
    },
  }),
};
