/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GraphQL endpoint of apps/api. Defaults to http://localhost:3000/graphql. */
  readonly VITE_GRAPHQL_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
