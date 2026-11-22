import type { ReactNode } from "react"

import { LocaleProvider } from "@/i18n/locale-provider"
import type { Locale } from "@/i18n/messages"

/** Pins the locale so tests never depend on jsdom's navigator.language. */
export function TestLocale({
  locale = "en",
  children,
}: {
  locale?: Locale
  children: ReactNode
}) {
  return <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
}
