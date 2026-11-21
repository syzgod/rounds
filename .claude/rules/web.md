---
paths:
  - "apps/web/**"
---

# apps/web rules

## React 19

- Write function components with named exports and typed props (`type FooProps = { … }`). Pass `ref` as an ordinary prop; `forwardRef` isn't needed.
- Import app code through the `@/` alias (`@/components/...`, `@/lib/...`).
- Keep components presentational where possible. GraphQL operations live with the component that uses them, or in `src/graphql/` when several components share them.

## shadcn/ui on Base UI (`base-nova`)

- Primitives come from `@base-ui/react`, not Radix. To change the rendered element, use the Base UI **`render` prop**: `<Button render={<a href="/x" />}>`. The Radix-era `asChild` prop does not exist here and must not be used.
- Add components with `pnpm --filter web exec shadcn add <name>`. Files in `src/components/ui/` are generated; customise them through `cva` variants and `className`, and keep their structure as generated.
- Merge classes with `cn` (from `@/lib/utils`). Style with Tailwind v4 utilities and the theme tokens in `src/index.css` (`bg-background`, `text-muted-foreground`, `bg-destructive/10`, …) rather than raw colour values.

## Apollo Client v4

- Import core APIs from `@apollo/client` (`ApolloClient`, `InMemoryCache`, `HttpLink`, `gql`) and React APIs from **`@apollo/client/react`** (`ApolloProvider`, `useQuery`, `useMutation`, …).
- The client is created once in `src/lib/apollo-client.ts` with an explicit `HttpLink` pointing at `import.meta.env.VITE_GRAPHQL_URL` (default `http://localhost:3000/graphql`). Leave the `ApolloClient` constructor without `uri` or `headers` options, because v4 removed them.
- Type every operation as `TypedDocumentNode<Data, Variables>` and handle the case where `data` is undefined.
- Select `id` (and `__typename`, which Apollo adds automatically) on every object so the default `InMemoryCache` normalizes it. Leave `keyFields` and `typePolicies` alone unless a specific case needs them.
- Select `rawJson` only in the Resource Inspector's own query. Directory and timeline queries leave it out, so lists stay small and the Inspector fetches it only when opened.
- `ApolloError` no longer exists. `error` is an `ErrorLike` (`import type { ErrorLike } from "@apollo/client"`); narrow it with the static guards `CombinedGraphQLErrors.is(error)`, `ServerError.is(error)` and `ServerParseError.is(error)` from `@apollo/client/errors`, and fall back to a generic network message.
- Every query renders explicit **loading**, **error** (with a retry where it makes sense) and **success** states.
- Tests use `MockedProvider` from `@apollo/client/testing/react`. Its mocks have a realistic 20–50 ms delay by default, so assert the loading state synchronously and wait for the final state with `findBy*`.

## Accessible, keyboard-first UI

- Every action is reachable and operable by keyboard alone (Tab, Shift+Tab, Enter, Space, Escape, arrow keys inside composite widgets). Use `<button>` and `<a>` (or Base UI components) for interactive elements; never put click handlers on `div`s.
- Keep the visible focus ring (`focus-visible:` styles from the shadcn components).
- Announce async state changes in a `role="status"` / `aria-live="polite"` region that stays mounted.
- Give every control an accessible name, and use semantic landmarks (`header`, `main`, `nav`) and a sensible heading order.
- In tests, query by role and accessible name (`getByRole("button", { name: "Retry" })`), with `getByText` as the fallback.

## Testing (Vitest + Testing Library)

- Tests sit beside the code as `src/**/*.test.tsx` and run in jsdom (`pnpm --filter web test`). Setup is in `src/test/setup.ts`.
- Vitest globals are **off**: import `describe`, `it`, `expect` and `vi` from `vitest`.

## Skills

- Load `shadcn` before adding, composing or restyling components.
- Load `apollo-client` when writing operations, cache logic or Apollo tests.
- Load `graphql-operations` when organizing queries and fragments.
