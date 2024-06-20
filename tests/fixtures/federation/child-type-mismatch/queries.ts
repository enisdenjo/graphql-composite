import { parse } from 'graphql';
import { FixtureQueries } from '../../../utils.js';

export const queries: FixtureQueries = [
  {
    name: 'InternalAlias',
    // User.id and Admin.id have similar output types,
    // but one returns a non-nullable field and the other a nullable field.
    // To avoid a GraphQL error, we need to alias the field.
    document: parse(/* GraphQL */ `
      query InternalAlias {
        users {
          id
          name
        }
        accounts {
          ... on User {
            id
            name
          }
          ... on Admin {
            id
            name
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        users: [
          {
            id: 'u1',
            name: 'u1-name',
          },
        ],
        accounts: [
          {
            id: 'u1',
            name: 'u1-name',
          },
          {
            id: 'a1',
            name: 'a1-name',
          },
        ],
      },
    },
  },
  {
    name: 'NestedInternalAlias',
    document: parse(/* GraphQL */ `
      query NestedInternalAlias {
        users {
          id
          name
        }
        accounts {
          ... on User {
            id
            name
            similarAccounts {
              ... on User {
                id
                name
              }
              ... on Admin {
                id
                name
              }
            }
          }
          ... on Admin {
            id
            name
            similarAccounts {
              ... on User {
                id
                name
              }
              ... on Admin {
                id
                name
              }
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        users: [
          {
            id: 'u1',
            name: 'u1-name',
          },
        ],
        accounts: [
          {
            id: 'u1',
            name: 'u1-name',
            similarAccounts: [
              {
                id: 'u1',
                name: 'u1-name',
              },
              {
                id: 'a1',
                name: 'a1-name',
              },
            ],
          },
          {
            id: 'a1',
            name: 'a1-name',
            similarAccounts: [
              {
                id: 'u1',
                name: 'u1-name',
              },
              {
                id: 'a1',
                name: 'a1-name',
              },
            ],
          },
        ],
      },
    },
  },
  //   {
  //     name: 'DeeplyNestedInternalAlias',
  //     document: parse(/* GraphQL */ `
  //       query DeeplyNestedInternalAlias {
  //         users {
  //           id
  //           name
  //         }
  //         accounts {
  //           ... on User {
  //             id
  //             name
  //             similarAccounts {
  //               ... on User {
  //                 id
  //                 name
  //                 similarAccounts {
  //                   ... on User {
  //                     id
  //                     name
  //                   }
  //                   ... on Admin {
  //                     id
  //                     name
  //                   }
  //                 }
  //               }
  //               ... on Admin {
  //                 id
  //                 name
  //                 similarAccounts {
  //                   ... on User {
  //                     id
  //                     name
  //                   }
  //                   ... on Admin {
  //                     id
  //                     name
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //           ... on Admin {
  //             id
  //             name
  //             similarAccounts {
  //               ... on User {
  //                 id
  //                 name
  //                 similarAccounts {
  //                   ... on User {
  //                     id
  //                     name
  //                   }
  //                   ... on Admin {
  //                     id
  //                     name
  //                   }
  //                 }
  //               }
  //               ... on Admin {
  //                 id
  //                 name
  //                 similarAccounts {
  //                   ... on User {
  //                     id
  //                     name
  //                   }
  //                   ... on Admin {
  //                     id
  //                     name
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     `),
  //     variables: {},
  //     result: {
  //       data: {
  //         users: [
  //           {
  //             id: 'u1',
  //             name: 'u1-name',
  //           },
  //         ],
  //         accounts: [
  //           {
  //             id: 'u1',
  //             name: 'u1-name',
  //             similarAccounts: [
  //               {
  //                 id: 'u1',
  //                 name: 'u1-name',
  //                 similarAccounts: [
  //                   {
  //                     id: 'u1',
  //                     name: 'u1-name',
  //                   },
  //                   {
  //                     id: 'a1',
  //                     name: 'a1-name',
  //                   },
  //                 ],
  //               },
  //               {
  //                 id: 'a1',
  //                 name: 'a1-name',
  //                 similarAccounts: [
  //                   {
  //                     id: 'u1',
  //                     name: 'u1-name',
  //                   },
  //                   {
  //                     id: 'a1',
  //                     name: 'a1-name',
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
  //           {
  //             id: 'a1',
  //             name: 'a1-name',
  //             similarAccounts: [
  //               {
  //                 id: 'u1',
  //                 name: 'u1-name',
  //                 similarAccounts: [
  //                   {
  //                     id: 'u1',
  //                     name: 'u1-name',
  //                   },
  //                   {
  //                     id: 'a1',
  //                     name: 'a1-name',
  //                   },
  //                 ],
  //               },
  //               {
  //                 id: 'a1',
  //                 name: 'a1-name',
  //                 similarAccounts: [
  //                   {
  //                     id: 'u1',
  //                     name: 'u1-name',
  //                   },
  //                   {
  //                     id: 'a1',
  //                     name: 'a1-name',
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //     },
  //   },
  {
    name: 'DeeplyNested',
    document: parse(/* GraphQL */ `
      query DeeplyNested {
        accounts {
          ... on User {
            name
            similarAccounts {
              ... on User {
                name
                similarAccounts {
                  ... on User {
                    name
                  }
                  ... on Admin {
                    name
                  }
                }
              }
              ... on Admin {
                name
                similarAccounts {
                  ... on User {
                    name
                  }
                  ... on Admin {
                    name
                  }
                }
              }
            }
          }
          ... on Admin {
            name
            similarAccounts {
              ... on User {
                name
                similarAccounts {
                  ... on User {
                    name
                  }
                  ... on Admin {
                    name
                  }
                }
              }
              ... on Admin {
                name
                similarAccounts {
                  ... on User {
                    name
                  }
                  ... on Admin {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `),
    variables: {},
    result: {
      data: {
        accounts: [
          {
            name: 'u1-name',
            similarAccounts: [
              {
                name: 'u1-name',
                similarAccounts: [
                  {
                    name: 'u1-name',
                  },
                  {
                    name: 'a1-name',
                  },
                ],
              },
              {
                name: 'a1-name',
                similarAccounts: [
                  {
                    name: 'u1-name',
                  },
                  {
                    name: 'a1-name',
                  },
                ],
              },
            ],
          },
          {
            name: 'a1-name',
            similarAccounts: [
              {
                name: 'u1-name',
                similarAccounts: [
                  {
                    name: 'u1-name',
                  },
                  {
                    name: 'a1-name',
                  },
                ],
              },
              {
                name: 'a1-name',
                similarAccounts: [
                  {
                    name: 'u1-name',
                  },
                  {
                    name: 'a1-name',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  },
];
