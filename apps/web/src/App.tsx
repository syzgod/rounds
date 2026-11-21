import { HealthStatus } from "@/components/health-status"

export function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <h1 className="text-sm font-medium">FHIR Patient Explorer</h1>
        <HealthStatus />
      </header>
      <main className="flex-1 p-6">
        <p className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </p>
      </main>
    </div>
  )
}

export default App
