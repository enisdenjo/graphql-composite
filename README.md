# graphql-composite

> [!CAUTION]
> Very WIP.

Spec agnostic GraphQL composite schema planner, executor and explainer.

## Get Started

```sh
yarn
```

## How does it work?

1. Parse a GraphQL composite schema to a [SchemaPlan](/src/schemaPlan.ts#SchemaPlan)
1. Create a [GatherPlan](/src/gather.ts#GatherPlan) using the [SchemaPlan](/src/schemaPlan.ts#SchemaPlan) and a GraphQL.js document
1. Execute a query using the [GatherPlan](/src/gather.ts#GatherPlan)
   - Execution will create a ready-to-use GraphQL response and an [ExecutionExplain](/src/execute.ts#ExecutionExplain) explaining the steps

\*[SchemaPlan](/src/schemaPlan.ts#SchemaPlan), [GatherPlan](/src/gather.ts#GatherPlan) as well as [ExecutionExplain](/src/execute.ts#ExecutionExplain) are serialisable to JSON.
