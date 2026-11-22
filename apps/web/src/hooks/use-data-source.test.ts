import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { useDataSource } from "@/hooks/use-data-source"
import { useSelectedPatient } from "@/hooks/use-selected-patient"

describe("useDataSource", () => {
  afterEach(() => window.history.replaceState(null, "", "/"))

  it("reads ?source=live and defaults to the demo patients", () => {
    window.history.replaceState(null, "", "/?source=live")
    expect(renderHook(() => useDataSource()).result.current[0]).toBe("LIVE")
    window.history.replaceState(null, "", "/")
    expect(renderHook(() => useDataSource()).result.current[0]).toBe("LOCAL")
  })

  it("writes the source to the URL and clears the selected patient", () => {
    window.history.replaceState(null, "", "/?patient=pat-amelia-hartwell")
    const { result } = renderHook(() => ({
      source: useDataSource(),
      patient: useSelectedPatient(),
    }))
    expect(result.current.patient[0]).toBe("pat-amelia-hartwell")

    act(() => result.current.source[1]("LIVE"))
    expect(result.current.source[0]).toBe("LIVE")
    expect(result.current.patient[0]).toBeNull()
    expect(window.location.search).toBe("?source=live")

    act(() => result.current.source[1]("LOCAL"))
    expect(window.location.search).toBe("")
  })
})
