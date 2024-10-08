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
      fields: {
        animal: {
          name: 'animal',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'Animal',
            store: 'Animal',
          },
          resolvers: {
            shelter: {
              subgraph: 'shelter',
              kind: 'interface',
              type: 'Animal',
              ofType: 'Animal',
              operation: /* GraphQL */ `
                query animal($name: ID!) {
                  animal(name: $name) {
                    ...__export
                  }
                }
              `,
              variables: {
                name: {
                  kind: 'user',
                  name: 'name',
                },
              },
            },
            store: {
              subgraph: 'store',
              kind: 'interface',
              type: 'Animal',
              ofType: 'Animal',
              operation: /* GraphQL */ `
                query animal($name: ID!) {
                  animal(name: $name) {
                    ...__export
                  }
                }
              `,
              variables: {
                name: {
                  kind: 'user',
                  name: 'name',
                },
              },
            },
          },
        },
      },
      resolvers: {},
    },
    Animal: {
      kind: 'interface',
      name: 'Animal',
      fields: {
        name: {
          name: 'name',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'ID!',
            store: 'ID!',
          },
          resolvers: {},
        },
        type: {
          name: 'type',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'String!',
            store: 'String!',
          },
          resolvers: {},
        },
        bestFriend: {
          name: 'bestFriend',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'Animal',
            store: 'Animal',
          },
          resolvers: {},
        },
      },
      resolvers: {
        shelter: [
          {
            subgraph: 'shelter',
            kind: 'interface',
            type: 'Animal',
            ofType: 'Animal',
            operation: /* GraphQL */ `
              query AnimalByName($name: ID!) {
                animal(name: $name) {
                  ...__export
                }
              }
            `,
            variables: {
              name: {
                kind: 'select',
                name: 'name',
                select: 'name',
              },
            },
          },
        ],
        store: [
          {
            subgraph: 'store',
            kind: 'interface',
            type: 'Animal',
            ofType: 'Animal',
            operation: /* GraphQL */ `
              query AnimalByName($name: ID!) {
                animal(name: $name) {
                  ...__export
                }
              }
            `,
            variables: {
              name: {
                kind: 'select',
                name: 'name',
                select: 'name',
              },
            },
          },
        ],
      },
    },
    Cat: {
      kind: 'object',
      name: 'Cat',
      implements: {
        Animal: {
          name: 'Animal',
          subgraphs: ['shelter', 'store'],
        },
      },
      fields: {
        name: {
          name: 'name',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'ID!',
            store: 'ID!',
          },
          resolvers: {},
        },
        type: {
          name: 'type',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'String!',
            store: 'String!',
          },
          resolvers: {},
        },
        meows: {
          name: 'meows',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'Boolean!',
            store: 'Boolean!',
          },
          resolvers: {},
        },
        bestFriend: {
          name: 'bestFriend',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'Animal',
            store: 'Animal',
          },
          resolvers: {},
        },
      },
      resolvers: {
        shelter: [
          {
            subgraph: 'shelter',
            kind: 'object',
            type: 'Cat',
            ofType: 'Cat',
            operation: /* GraphQL */ `
              query CatByName($name: ID!) {
                animal(name: $name) {
                  ...__export
                }
              }
            `,
            variables: {
              name: {
                kind: 'select',
                name: 'name',
                select: 'name',
              },
            },
          },
        ],
        store: [
          {
            subgraph: 'store',
            kind: 'object',
            type: 'Cat',
            ofType: 'Cat',
            operation: /* GraphQL */ `
              query CatByName($name: ID!) {
                animal(name: $name) {
                  ...__export
                }
              }
            `,
            variables: {
              name: {
                kind: 'select',
                name: 'name',
                select: 'name',
              },
            },
          },
        ],
      },
    },
    Dog: {
      kind: 'object',
      name: 'Dog',
      implements: {
        Animal: {
          name: 'Animal',
          subgraphs: ['shelter', 'store'],
        },
      },
      fields: {
        name: {
          name: 'name',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'ID!',
            store: 'ID!',
          },
          resolvers: {},
        },
        type: {
          name: 'type',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'String!',
            store: 'String!',
          },
          resolvers: {},
        },
        barks: {
          name: 'barks',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'Boolean!',
            store: 'Boolean!',
          },
          resolvers: {},
        },
        bestFriend: {
          name: 'bestFriend',
          subgraphs: ['shelter', 'store'],
          types: {
            shelter: 'Animal',
            store: 'Animal',
          },
          resolvers: {},
        },
      },
      resolvers: {
        shelter: [
          {
            subgraph: 'shelter',
            kind: 'object',
            type: 'Dog',
            ofType: 'Dog',
            operation: /* GraphQL */ `
              query DogByName($name: ID!) {
                animal(name: $name) {
                  ...__export
                }
              }
            `,
            variables: {
              name: {
                kind: 'select',
                name: 'name',
                select: 'name',
              },
            },
          },
        ],
        store: [
          {
            subgraph: 'store',
            kind: 'object',
            type: 'Dog',
            ofType: 'Dog',
            operation: /* GraphQL */ `
              query DogByName($name: ID!) {
                animal(name: $name) {
                  ...__export
                }
              }
            `,
            variables: {
              name: {
                kind: 'select',
                name: 'name',
                select: 'name',
              },
            },
          },
        ],
      },
    },
  },
};
