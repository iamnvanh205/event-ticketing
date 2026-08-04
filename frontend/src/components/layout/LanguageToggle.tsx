import { Languages } from 'lucide-react'
import { languageNames, useLanguage, useLanguageCopy } from '../../lib/language'

export function LanguageToggle({ labelled = false }: { labelled?: boolean }) {
  const { language, setLanguage } = useLanguage()
  const ui = useLanguageCopy()
  const next = language === 'en' ? 'vi' : 'en'

  return (
    <button
      className={`${labelled ? 'nav-link' : 'icon-button'} language-toggle`}
      type="button"
      onClick={() => setLanguage(next)}
      aria-label={language === 'en' ? ui.language.switchToVietnamese : ui.language.switchToEnglish}
    >
      <Languages aria-hidden="true" size={18} />
      {labelled && <span>{languageNames[next]}</span>}
    </button>
  )
}
