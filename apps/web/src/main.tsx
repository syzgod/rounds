import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ApolloProvider } from "@apollo/client/react"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"
import { apolloClient } from "@/lib/apollo-client.ts"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <ThemeProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </ApolloProvider>
  </StrictMode>
)
