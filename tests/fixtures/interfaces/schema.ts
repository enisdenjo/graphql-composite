import { OperationTypeNode } from 'graphql';
import { SchemaPlan } from '../../../src/schemaPlan.js';

export const schema: SchemaPlan = {
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
    },
  },
  interfaces: {
    Animal: {
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
        shelter: {
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
        store: {
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
      },
    },
  },
  objects: {
    Cat: {
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
        shelter: {
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
        store: {
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
      },
    },
    Dog: {
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
        shelter: {
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
        store: {
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
      },
    },
  },
};
