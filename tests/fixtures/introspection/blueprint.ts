import { Blueprint } from '../../../src/blueprint.js';

export const blueprint: Blueprint = {
  schema: /* GraphQL */ `
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

    type Query {
      animal(name: ID!): Animal
    }
  `,
  types: {
    Query: {
      kind: 'object',
      name: 'Query',
      implements: {},
      fields: {},
      resolvers: {},
    },
  },
};
