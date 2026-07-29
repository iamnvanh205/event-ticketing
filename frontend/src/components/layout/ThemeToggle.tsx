import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return (
    <button className={`${labelled ? 'nav-link' : 'icon-button'} theme-toggle ${dark ? 'is-dark' : ''}`} type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={`Use ${dark ? 'light' : 'dark'} theme`}>
      <span className="theme-toggle-icon" aria-hidden="true">
        <Sun className="theme-sun" size={18} />
        <Moon className="theme-moon" size={18} />
      </span>
      {labelled && <span>{dark ? 'Light theme' : 'Dark theme'}</span>}
    </button>
  )
}
