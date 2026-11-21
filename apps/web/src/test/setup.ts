import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Vitest globals are off, so Testing Library cannot register auto-cleanup itself.
afterEach(() => {
  cleanup()
  window.history.replaceState(null, "", "/")
})

// jsdom gaps used by cmdk (Command): layout observation and scroll-into-view.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
