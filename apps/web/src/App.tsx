import { UsersIcon } from "lucide-react"

import { AppHeader } from "@/components/app-header"
import { PatientDirectory } from "@/components/patient-directory"
import { PatientSummaryPanel } from "@/components/patient-summary"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { useSelectedPatient } from "@/hooks/use-selected-patient"

function NoPatientSelected() {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon />
        </EmptyMedia>
        <EmptyTitle>Select a patient</EmptyTitle>
        <EmptyDescription>
          Choose a patient from the directory to see their record.
        </EmptyDescription>
      </EmptyHeader>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Kbd>/</Kbd> search
        </li>
        <li className="flex items-center gap-1.5">
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </KbdGroup>{" "}
          move
        </li>
        <li className="flex items-center gap-1.5">
          <Kbd>Enter</Kbd> open
        </li>
        <li className="flex items-center gap-1.5">
          <Kbd>D</Kbd> theme
        </li>
      </ul>
    </Empty>
  )
}

export function App() {
  const [selectedId, setSelectedId] = useSelectedPatient()

  return (
    <div className="flex h-svh flex-col">
      {/* Skip link: bypasses the header and the patient list for keyboard users. */}
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-background focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to patient record
      </a>
      <AppHeader />
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,16rem)_1fr] md:grid-cols-[20rem_1fr] md:grid-rows-1">
        {/* Plain wrapper: the <nav> inside is the landmark (an <aside> would add a second one). */}
        <div className="flex min-h-0 flex-col border-b bg-sidebar text-sidebar-foreground md:border-r md:border-b-0">
          <PatientDirectory selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-0 overflow-y-auto outline-none"
        >
          <div className="mx-auto flex h-full max-w-4xl flex-col p-6">
            {selectedId ? (
              <PatientSummaryPanel
                key={selectedId}
                patientId={selectedId}
                onClearSelection={() => setSelectedId(null)}
              />
            ) : (
              <NoPatientSelected />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
