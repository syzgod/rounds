import { Loader2Icon } from "lucide-react"

type LoadingNoteProps = {
  /** Shown with a spinner; `null` keeps the (empty) status region mounted. */
  text: string | null
  /** Set `false` when a nearby status region already announces the text. */
  announce?: boolean
}

/** One line "still loading" note. The status region stays mounted so screen readers hear it. */
export function LoadingNote({ text, announce = true }: LoadingNoteProps) {
  return (
    <p
      {...(announce
        ? { role: "status", "aria-live": "polite" }
        : { "aria-hidden": true })}
      className={
        text
          ? "flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground"
          : "sr-only"
      }
    >
      {text ? (
        <Loader2Icon
          aria-hidden="true"
          className="size-3.5 shrink-0 motion-safe:animate-spin"
        />
      ) : null}
      {text}
    </p>
  )
}
