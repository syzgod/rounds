import { useCallback, useEffect, useState } from "react"

import type { DataSource } from "@/graphql/__generated__/graphql"

const PARAM = "source"

function readFromUrl(): DataSource {
  return new URLSearchParams(window.location.search).get(PARAM) === "live"
    ? "LIVE"
    : "LOCAL"
}

/**
 * The patient data source, mirrored in `?source=live` (absent for the demo
 * patients), so a reload and the Back button keep it. Changing the source
 * clears the selected patient, which belongs to the old source.
 */
export function useDataSource(): [DataSource, (next: DataSource) => void] {
  const [source, setSource] = useState<DataSource>(readFromUrl)

  useEffect(() => {
    const onPopState = () => setSource(readFromUrl())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const select = useCallback((next: DataSource) => {
    setSource(next)
    if (next === readFromUrl()) return
    const url = new URL(window.location.href)
    url.searchParams.delete("patient")
    if (next === "LIVE") url.searchParams.set(PARAM, "live")
    else url.searchParams.delete(PARAM)
    window.history.pushState(null, "", url)
    // useSelectedPatient follows popstate; tell it the patient is gone.
    window.dispatchEvent(new PopStateEvent("popstate"))
  }, [])

  return [source, select]
}
