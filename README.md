# graphql-composite

> [!CAUTION]
> Very WIP.

Spec agnostic GraphQL composite schema planner, executor and explainer.

## Features

- Zero-dependency
  - _Not at the moment because I am lazy - [see deps](/package.json)) - they'll be dropped in future iterations_
- Spec agnostic
  - Even specless since you can design your own [SchemaPlan](/src/schemaPlan.ts#SchemaPlan)
- Runs in any environment
- Stable plans and explanations
- Everything's JSON serialisable, all steps until execution can be cached

## Get started

See [plan, gather and execute tests](/tests/planGatherAndExecute.test.ts), and the accompanying [fixtures](/tests/fixtures).

## How does it work?

1. Parse a GraphQL composite schema to a [SchemaPlan](/src/schemaPlan.ts#SchemaPlan)
1. Create a [GatherPlan](/src/gather.ts#GatherPlan) using the [SchemaPlan](/src/schemaPlan.ts#SchemaPlan) and a GraphQL.js document
1. Execute a query using the [GatherPlan](/src/gather.ts#GatherPlan)
   - Execution will create a ready-to-use GraphQL response and an [ExecutionExplain](/src/execute.ts#ExecutionExplain) explaining the steps

\*_[SchemaPlan](/src/schemaPlan.ts#SchemaPlan), [GatherPlan](/src/gather.ts#GatherPlan) as well as [ExecutionExplain](/src/execute.ts#ExecutionExplain) are serialisable to JSON._
