import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { installInternalNavigation, navigate, useLocationSearch, usePath } from './navigation'

beforeEach(() => {
  // Reset location to '/'
  window.history.pushState({}, '', '/')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('navigate()', () => {
  it('changes window.location.pathname', () => {
    navigate('/events')
    expect(window.location.pathname).toBe('/events')
  })

  it('dispatches a popstate event', () => {
    const listener = vi.fn()
    window.addEventListener('popstate', listener)
    navigate('/tickets')
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener('popstate', listener)
  })

  it('navigates to nested paths', () => {
    navigate('/events/42')
    expect(window.location.pathname).toBe('/events/42')
  })

  it('navigates to root path', () => {
    navigate('/events')
    navigate('/')
    expect(window.location.pathname).toBe('/')
  })
})

describe('installInternalNavigation()', () => {
  it('intercepts ordinary same-origin links', () => {
    const uninstall = installInternalNavigation()
    const anchor = document.createElement('a')
    anchor.href = '/events/42'
    document.body.append(anchor)

    const click = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true })
    anchor.dispatchEvent(click)

    expect(click.defaultPrevented).toBe(true)
    expect(window.location.pathname).toBe('/events/42')
    anchor.remove()
    uninstall()
  })

  it('preserves modified clicks', () => {
    const uninstall = installInternalNavigation()
    const anchor = document.createElement('a')
    anchor.href = '/events/42'
    document.body.append(anchor)
    const pushState = vi.spyOn(window.history, 'pushState')
    document.addEventListener('click', (event) => event.preventDefault(), { once: true })

    const click = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true, ctrlKey: true })
    anchor.dispatchEvent(click)

    expect(pushState).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/')
    anchor.remove()
    uninstall()
  })
})

describe('usePath()', () => {
  it('returns the current pathname on mount', () => {
    window.history.pushState({}, '', '/events')
    const { result } = renderHook(() => usePath())
    expect(result.current).toBe('/events')
  })

  it('updates when navigate() is called', () => {
    window.history.pushState({}, '', '/events')
    const { result } = renderHook(() => usePath())

    act(() => {
      navigate('/tickets')
    })

    expect(result.current).toBe('/tickets')
  })

  it('updates on manual pushState + popstate event', () => {
    const { result } = renderHook(() => usePath())

    act(() => {
      window.history.pushState({}, '', '/checkin')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current).toBe('/checkin')
  })

  it('cleans up popstate listener on unmount', () => {
    const { result, unmount } = renderHook(() => usePath())

    act(() => { navigate('/events') })
    expect(result.current).toBe('/events')

    unmount()

    // After unmount, hook should no longer track changes
    act(() => { navigate('/tickets') })
    expect(result.current).toBe('/events') // still the last value before unmount
  })
})

describe('useLocationSearch()', () => {
  it('updates when the query string changes on the same page', () => {
    window.history.pushState({}, '', '/search?q=music')
    const { result } = renderHook(() => useLocationSearch())

    act(() => {
      navigate('/search?q=design')
    })

    expect(result.current).toBe('?q=design')
  })
})
