import { useCallback, useEffect, useState } from "react"

const PARAM = "patient"

function readFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM)
}

/**
 * The selected patient id, mirrored in `?patient=<id>` so a reload keeps the
 * selection and the browser Back button steps through previous patients.
 */
export function useSelectedPatient(): [
  string | null,
  (id: string | null) => void,
] {
  const [selectedId, setSelectedId] = useState<string | null>(readFromUrl)

  useEffect(() => {
    const onPopState = () => setSelectedId(readFromUrl())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const select = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id === readFromUrl()) return
    const url = new URL(window.location.href)
    if (id) url.searchParams.set(PARAM, id)
    else url.searchParams.delete(PARAM)
    window.history.pushState(null, "", url)
  }, [])

  return [selectedId, select]
}
