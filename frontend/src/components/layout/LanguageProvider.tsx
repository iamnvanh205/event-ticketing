import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, languageStorageKey, type Language } from '../../lib/language'

function getInitialLanguage() {
  if (typeof window === 'undefined') return 'en' as Language

  try {
    const stored = window.localStorage.getItem(languageStorageKey)
    if (stored === 'en' || stored === 'vi') return stored
  } catch {
    // Ignore storage errors and fall back to browser language.
  }

  const preferred = window.navigator.languages?.[0] ?? window.navigator.language ?? ''
  return preferred.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem(languageStorageKey, language)
    } catch {
      // Ignore storage errors; the in-memory setting still works.
    }
  }, [language])

  const value = useMemo(() => ({ language, setLanguage }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
