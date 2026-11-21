import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"

const DEFAULT_GRAPHQL_URL = "http://localhost:3000/graphql"

export const graphqlUrl =
  import.meta.env.VITE_GRAPHQL_URL ?? DEFAULT_GRAPHQL_URL

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphqlUrl }),
  cache: new InMemoryCache(),
})
