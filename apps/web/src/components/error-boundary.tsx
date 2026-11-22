import { Component, type ReactNode } from "react"
import { AlertCircleIcon, RotateCwIcon } from "lucide-react"

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/locale-provider"

type ErrorBoundaryProps = { children: ReactNode; fallback: ReactNode }
type ErrorBoundaryState = { failed: boolean }

/** Shows `fallback` when a child throws while rendering, instead of a blank page. */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

type ErrorFallbackProps = { message?: string }

/**
 * One-line error with "Reload". A reload also fetches new code after a deploy
 * (old chunk files are gone), and the selected patient stays in the URL.
 */
export function ErrorFallback({ message }: ErrorFallbackProps) {
  const { t } = useI18n()
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{message ?? t.common.unexpectedError}</AlertTitle>
      <AlertAction>
        <Button
          size="xs"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <RotateCwIcon data-icon="inline-start" />
          {t.common.reload}
        </Button>
      </AlertAction>
    </Alert>
  )
}
