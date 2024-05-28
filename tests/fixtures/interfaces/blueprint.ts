import { OperationTypeNode } from 'graphql';
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
  operations: {
    query: {
      name: OperationTypeNode.QUERY,
      fields: {
        animal: {
          name: 'animal',
          resolvers: {
            shelter: {
              subgraph: 'shelter',
              kind: 'interface',
              type: 'Animal',
              ofType: 'Animal',
              resolvableTypes: ['Dog', 'Cat'],
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
              resolvableTypes: ['Dog', 'Cat'],
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
    },
  },
  types: {
    Animal: {
      kind: 'interface',
      name: 'Animal',
      fields: {
        name: {
          name: 'name',
          subgraphs: ['shelter', 'store'],
        },
        type: {
          name: 'type',
          subgraphs: ['shelter', 'store'],
        },
        bestFriend: {
          name: 'bestFriend',
          subgraphs: ['shelter', 'store'],
        },
      },
      resolvers: {
        shelter: [
          {
            subgraph: 'shelter',
            kind: 'interface',
            type: 'Animal',
            ofType: 'Animal',
            resolvableTypes: ['Dog', 'Cat'],
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
            resolvableTypes: ['Dog', 'Cat'],
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
      implements: ['Animal'],
      fields: {
        name: {
          name: 'name',
          subgraphs: ['shelter', 'store'],
        },
        type: {
          name: 'type',
          subgraphs: ['shelter', 'store'],
        },
        meows: {
          name: 'meows',
          subgraphs: ['shelter', 'store'],
        },
        bestFriend: {
          name: 'bestFriend',
          subgraphs: ['shelter', 'store'],
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
      implements: ['Animal'],
      fields: {
        name: {
          name: 'name',
          subgraphs: ['shelter', 'store'],
        },
        type: {
          name: 'type',
          subgraphs: ['shelter', 'store'],
        },
        barks: {
          name: 'barks',
          subgraphs: ['shelter', 'store'],
        },
        bestFriend: {
          name: 'bestFriend',
          subgraphs: ['shelter', 'store'],
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
