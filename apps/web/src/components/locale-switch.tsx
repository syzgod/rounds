import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useI18n } from "@/i18n/locale-provider"
import { isLocale } from "@/i18n/messages"

export function LocaleSwitch() {
  const { locale, t, setLocale } = useI18n()

  return (
    <ToggleGroup
      aria-label={t.language.label}
      variant="outline"
      size="sm"
      spacing={0}
      value={[locale]}
      onValueChange={(value) => {
        // Single-select: ignore attempts to un-press the active language.
        const next = value[0]
        if (isLocale(next)) setLocale(next)
      }}
    >
      <ToggleGroupItem value="en" aria-label={t.language.english}>
        EN
      </ToggleGroupItem>
      <ToggleGroupItem value="de" aria-label={t.language.german}>
        DE
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
