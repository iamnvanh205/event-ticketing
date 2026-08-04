import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLanguageCopy } from '../../lib/language'

export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const ui = useLanguageCopy()
  const dark = resolvedTheme === 'dark'

  return (
    <button
      className={`${labelled ? 'nav-link' : 'icon-button'} theme-toggle ${dark ? 'is-dark' : ''}`}
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? ui.theme.switchToLight : ui.theme.switchToDark}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <Sun className="theme-sun" size={18} />
        <Moon className="theme-moon" size={18} />
      </span>
      {labelled && <span>{dark ? ui.theme.light : ui.theme.dark}</span>}
    </button>
  )
}
