import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useSelectedPatient } from "@/hooks/use-selected-patient"

describe("useSelectedPatient", () => {
  it("reads the initial selection from ?patient=", () => {
    window.history.replaceState(null, "", "/?patient=pat-priya-natarajan")
    const { result } = renderHook(() => useSelectedPatient())
    expect(result.current[0]).toBe("pat-priya-natarajan")
  })

  it("writes the selection to the URL and follows Back", () => {
    const { result } = renderHook(() => useSelectedPatient())
    expect(result.current[0]).toBeNull()

    act(() => result.current[1]("pat-amelia-hartwell"))
    expect(result.current[0]).toBe("pat-amelia-hartwell")
    expect(window.location.search).toBe("?patient=pat-amelia-hartwell")

    act(() => {
      window.history.replaceState(null, "", "/?patient=pat-jonah-reyes")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
    expect(result.current[0]).toBe("pat-jonah-reyes")

    act(() => result.current[1](null))
    expect(result.current[0]).toBeNull()
    expect(window.location.search).toBe("")
  })
})
