import type { CodegenConfig } from "@graphql-codegen/cli"

/**
 * Types for the web app's GraphQL operations, generated from the committed
 * API schema (no running server needed). Types only, no runtime code, as
 * Apollo recommends: https://www.apollographql.com/docs/react/development-testing/graphql-codegen
 * Run `pnpm --filter web codegen` after a schema or operation change; CI
 * fails when the generated file is stale.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: "../api/src/schema.gql",
  documents: ["src/**/*.{ts,tsx}", "!src/graphql/__generated__/**"],
  generates: {
    "src/graphql/__generated__/graphql.ts": {
      plugins: ["typescript-operations"],
      config: {
        // `null` for nullable fields, not optional properties.
        avoidOptionals: { field: true, inputValue: false },
        // String unions instead of TS enums: no runtime code.
        enumsAsTypes: true,
        defaultScalarType: "unknown",
        // Apollo Client adds __typename to every object except root types.
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
      },
    },
  },
}

export default config
