---
paths:
  - "apps/web/**"
---

# apps/web rules

## React 19

- Function components with named exports and typed props (`type FooProps = { … }`). `ref` is an ordinary prop.
- Import app code through `@/` (`@/components/...`, `@/lib/...`).
- GraphQL operations live with their component, or in `src/graphql/` when several components share them.
- All user-facing text comes from `src/i18n/en.ts` and `de.ts` (`useI18n()`); `de` must match `en` key for key.

## shadcn/ui on Base UI (`base-nova`)

- Primitives come from `@base-ui/react`. Change the rendered element with the `render` prop: `<Button render={<a href="/x" />}>`.
- Add components with `pnpm --filter web exec shadcn add <name>`. Customise `src/components/ui/` through `cva` variants, `className` and small props; keep the generated structure.
- Merge classes with `cn` (`@/lib/utils`). Style with Tailwind v4 utilities and the theme tokens in `src/index.css`.
- Load the `shadcn` skill before you add, compose or restyle components.

## Apollo Client v4

- Core APIs come from `@apollo/client`; React hooks from `@apollo/client/react`. The client lives in `src/lib/apollo-client.ts` with an explicit `HttpLink` to `VITE_GRAPHQL_URL`.
- Type operations as `TypedDocumentNode<XQuery, XQueryVariables>` from `src/graphql/__generated__/graphql.ts`. Run `pnpm --filter web codegen` after you change an operation or `schema.gql`.
- Select `id` on every object. Select `rawJson` only in the source viewer's own query.
- `error` is an `ErrorLike`; narrow it with `CombinedGraphQLErrors.is()` / `ServerError.is()` from `@apollo/client/errors` (`ApolloError` is gone in v4).
- Every query renders loading, error (one line + Retry) and success states.
- Load the `apollo-client` skill for operations, cache logic or Apollo tests.

## Accessible, keyboard-first UI

- Interactive elements are `<button>`, `<a>` or Base UI components, with a visible focus ring and an accessible name.
- Announce async state in a `role="status"` region that stays mounted.
- Use landmarks (`header`, `main`, `nav`) and a sensible heading order.

## Testing (Vitest + Testing Library, globals off)

- Tests sit beside the code as `*.test.tsx`; import `describe`, `it`, `expect`, `vi` from `vitest`.
- Query by role and accessible name; `getByText` is the fallback.
- `MockedProvider` (`@apollo/client/testing/react`) delays mocks by 20–50 ms: assert loading synchronously, then `findBy*`.
- Wrap renders in `TestLocale` (`@/test/i18n`) to pin the language.
