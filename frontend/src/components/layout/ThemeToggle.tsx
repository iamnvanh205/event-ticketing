import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return (
    <button className={labelled ? 'nav-link' : 'icon-button'} type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={`Use ${dark ? 'light' : 'dark'} theme`}>
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
      {labelled && <span>{dark ? 'Light theme' : 'Dark theme'}</span>}
    </button>
  )
}
