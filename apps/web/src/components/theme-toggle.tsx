import { MoonIcon, SunIcon } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
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
  const isDark = theme === "dark" || (theme === "system" && prefersDark())

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            onClick={() => setTheme(isDark ? "light" : "dark")}
          />
        }
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </TooltipTrigger>
      <TooltipContent>
        Toggle theme <Kbd>D</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
