import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"

const DEFAULT_GRAPHQL_URL = "http://localhost:3000/graphql"

export const graphqlUrl =
  import.meta.env.VITE_GRAPHQL_URL ?? DEFAULT_GRAPHQL_URL

export function createCache(): InMemoryCache {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cache redirect: `patient(id)` reads the Patient the directory
          // already normalized, so selecting a patient renders instantly.
          // Unknown ids fall through to the network.
          patient: {
            read(existing, { args, toReference }) {
              if (existing !== undefined) return existing
              const id: unknown = args?.id
              return typeof id === "string"
                ? toReference({ __typename: "Patient", id })
                : undefined
            },
          },
        },
      },
    },
  })
}

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphqlUrl }),
  cache: createCache(),
})
