import { MoonIcon, SunIcon } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/locale-provider"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const isDark = theme === "dark" || (theme === "system" && prefersDark())

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              isDark ? t.theme.toLight : t.theme.toDark
            }
            onClick={() => setTheme(isDark ? "light" : "dark")}
          />
        }
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </TooltipTrigger>
      <TooltipContent>
        {t.theme.toggle} <Kbd>D</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
