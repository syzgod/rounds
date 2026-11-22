import { HeartPulseIcon } from "lucide-react"

import { LocaleSwitch } from "@/components/locale-switch"
import { HealthStatus } from "@/components/health-status"
import { TextSizeSwitch } from "@/components/text-size-switch"
import { ThemeToggle } from "@/components/theme-toggle"
import { useI18n } from "@/i18n/locale-provider"

export function AppHeader() {
  const { t } = useI18n()
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
          <p className="hidden text-xs text-muted-foreground sm:block">
            {t.app.tagline}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <HealthStatus />
        {/* Phones have pinch zoom, and the header has no room for it there. */}
        <div className="hidden sm:block">
          <TextSizeSwitch />
        </div>
        <LocaleSwitch />
        <ThemeToggle />
      </div>
    </header>
  )
}
