import { useState } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useI18n } from "@/i18n/locale-provider"
import {
  applyTextSize,
  isTextSize,
  readTextSize,
  type TextSize,
} from "@/lib/text-size"

/** Three text sizes; each "A" is drawn larger so the choice reads without words. */
const ITEMS: readonly { size: TextSize; className: string }[] = [
  { size: "normal", className: "text-xs" },
  { size: "large", className: "text-sm" },
  { size: "larger", className: "text-base" },
]

export function TextSizeSwitch() {
  const { t } = useI18n()
  const [size, setSize] = useState(readTextSize)

  return (
    <ToggleGroup
      aria-label={t.textSize.label}
      variant="outline"
      size="sm"
      spacing={0}
      value={[size]}
      onValueChange={(value) => {
        // Single-select: ignore attempts to un-press the active size.
        const next = value[0]
        if (!isTextSize(next)) return
        setSize(next)
        applyTextSize(next)
      }}
    >
      {ITEMS.map((item) => (
        <ToggleGroupItem
          key={item.size}
          value={item.size}
          aria-label={t.textSize[item.size]}
          className={item.className}
        >
          A
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
