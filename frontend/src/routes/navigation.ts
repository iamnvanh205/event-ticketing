import { useEffect, useState } from 'react'

export function navigate(path: string) {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (path === current) return

  window.history.pushState({ appNavigation: true }, '', path)
  window.dispatchEvent(new PopStateEvent('popstate', { state: { appNavigation: true } }))
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0 })
    document.getElementById('main-content')?.focus({ preventScroll: true })
  })
}

export function installInternalNavigation() {
  const handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!(event.target instanceof Element)) return

    const anchor = event.target.closest<HTMLAnchorElement>('a[href]')
    if (!anchor || anchor.target || anchor.download || anchor.dataset.nativeNavigation !== undefined) return
    if (anchor.origin !== window.location.origin || anchor.hash) return

    event.preventDefault()
    navigate(`${anchor.pathname}${anchor.search}`)
  }

  document.addEventListener('click', handleClick)
  return () => document.removeEventListener('click', handleClick)
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return path
}

export function useLocationSearch() {
  const [search, setSearch] = useState(window.location.search)

  useEffect(() => {
    const sync = () => setSearch(window.location.search)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return search
}
