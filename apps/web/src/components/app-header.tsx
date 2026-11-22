import { HeartPulseIcon } from "lucide-react"

import { HealthStatus } from "@/components/health-status"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        >
          <HeartPulseIcon className="size-4" />
        </span>
        <div className="flex flex-col leading-tight">
          <h1 className="text-sm font-semibold">Rounds</h1>
          <p className="text-xs text-muted-foreground">
            Patient history at a glance · FHIR R4
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <HealthStatus />
        <ThemeToggle />
      </div>
    </header>
  )
}
