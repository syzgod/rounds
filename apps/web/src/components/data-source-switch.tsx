import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { DataSource } from "@/graphql/__generated__/graphql"
import { useI18n } from "@/i18n/locale-provider"

type DataSourceSwitchProps = {
  value: DataSource
  onChange: (next: DataSource) => void
}

function isDataSource(value: unknown): value is DataSource {
  return value === "LOCAL" || value === "LIVE"
}

/** Demo patients or the public FHIR test server, with a one-line note for live data. */
export function DataSourceSwitch({ value, onChange }: DataSourceSwitchProps) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-1.5">
      <ToggleGroup
        aria-label={t.dataSource.label}
        variant="outline"
        size="sm"
        spacing={0}
        value={[value]}
        onValueChange={(next) => {
          // Single-select: ignore attempts to un-press the active source.
          const source = next[0]
          if (isDataSource(source)) onChange(source)
        }}
        className="w-full *:flex-1"
      >
        <ToggleGroupItem value="LOCAL">{t.dataSource.local}</ToggleGroupItem>
        <ToggleGroupItem value="LIVE">{t.dataSource.live}</ToggleGroupItem>
      </ToggleGroup>
      {value === "LIVE" ? (
        <p className="px-1 text-xs text-muted-foreground">
          {t.dataSource.liveNote}
        </p>
      ) : null}
    </div>
  )
}
