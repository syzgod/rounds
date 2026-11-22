import * as React from "react"

import {
  LOCALE_STORAGE_KEY,
  MESSAGES,
  detectLocale,
  type Locale,
  type Messages,
} from "@/i18n/messages"

type I18n = {
  locale: Locale
  t: Messages
  setLocale: (locale: Locale) => void
}

const LocaleContext = React.createContext<I18n | undefined>(undefined)

type LocaleProviderProps = {
  children: React.ReactNode
  /** Overrides detection (saved choice, then browser language); used by tests. */
  initialLocale?: Locale
}

export function LocaleProvider({
  children,
  initialLocale,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = React.useState<Locale>(
    () => initialLocale ?? detectLocale()
  )

  React.useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Not persisted when storage is blocked; the choice still applies this session.
    }
  }, [])

  const value = React.useMemo<I18n>(
    () => ({ locale, t: MESSAGES[locale], setLocale }),
    [locale, setLocale]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useI18n(): I18n {
  const context = React.useContext(LocaleContext)
  if (!context) throw new Error("useI18n must be used within a LocaleProvider")
  return context
}
