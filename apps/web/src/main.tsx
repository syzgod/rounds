import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ApolloProvider } from "@apollo/client/react"

import "./index.css"
import App from "./App.tsx"
import { ErrorBoundary, ErrorFallback } from "@/components/error-boundary.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { LocaleProvider } from "@/i18n/locale-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"
import { apolloClient } from "@/lib/apollo-client.ts"
import { applyTextSize, readTextSize } from "@/lib/text-size.ts"

// Before the first render, so the saved text size never flashes.
applyTextSize(readTextSize())

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <LocaleProvider>
        <ThemeProvider>
          <TooltipProvider>
            <ErrorBoundary
              fallback={
                <div className="p-6">
                  <ErrorFallback />
                </div>
              }
            >
              <App />
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </LocaleProvider>
    </ApolloProvider>
  </StrictMode>
)
