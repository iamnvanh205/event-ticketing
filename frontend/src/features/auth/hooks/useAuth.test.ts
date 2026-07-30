import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAuth } from './useAuth'
import * as authApi from '../api/authApi'

vi.mock('../api/authApi')
vi.mock('../../../lib/apiClient', () => ({
  apiClient: {},
  setAccessToken: vi.fn(),
  setRefreshAccessToken: vi.fn(),
}))

const mockUser = { id: 1, email: 'customer@event.local', role: 'CUSTOMER' as const, fullName: 'Test User' }
const mockLoginResponse = { accessToken: 'token-abc', user: mockUser }

// Read state from the singleton store directly — avoids stale hook closure issues
function getState() {
  return useAuth.getState()
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.setState({ accessToken: null, user: null, loading: false })
})

describe('useAuth — login', () => {
  it('sets accessToken and user after successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue(mockLoginResponse)

    await act(async () => {
      await getState().login({ email: 'customer@event.local', password: 'Customer@123' })
    })

    expect(getState().user).toEqual(mockUser)
    expect(getState().accessToken).toBe('token-abc')
    expect(getState().loading).toBe(false)
  })

  it('sets loading to true during login, then false', async () => {
    let resolveLogin!: (v: typeof mockLoginResponse) => void
    vi.mocked(authApi.login).mockReturnValue(new Promise((r) => { resolveLogin = r }))

    const loginPromise = getState().login({ email: 'a@b.com', password: 'pass' })

    // loading should be true while pending
    expect(getState().loading).toBe(true)

    await act(async () => {
      resolveLogin(mockLoginResponse)
      await loginPromise
    })

    expect(getState().loading).toBe(false)
  })

  it('clears loading even when login throws', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Unauthorized'))

    await act(async () => {
      try { await getState().login({ email: 'bad@b.com', password: 'wrong' }) } catch { /* expected */ }
    })

    expect(getState().loading).toBe(false)
    expect(getState().user).toBeNull()
  })
})

describe('useAuth — register', () => {
  it('sets accessToken and user after successful register', async () => {
    vi.mocked(authApi.register).mockResolvedValue(mockLoginResponse)

    await act(async () => {
      await getState().register({ email: 'new@user.com', password: 'Pass123!', fullName: 'New User' })
    })

    expect(getState().user).toEqual(mockUser)
    expect(getState().accessToken).toBe('token-abc')
  })

  it('clears loading even when register throws', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('Conflict'))

    await act(async () => {
      try { await getState().register({ email: 'dup@user.com', password: 'pass', fullName: 'Dup' }) } catch { /* expected */ }
    })

    expect(getState().loading).toBe(false)
  })
})

describe('useAuth - Google login', () => {
  it('sets accessToken and user after successful Google login', async () => {
    vi.mocked(authApi.googleLogin).mockResolvedValue(mockLoginResponse)

    await act(async () => {
      await getState().googleLogin('google-id-token')
    })

    expect(vi.mocked(authApi.googleLogin)).toHaveBeenCalledWith('google-id-token')
    expect(getState().user).toEqual(mockUser)
    expect(getState().accessToken).toBe('token-abc')
    expect(getState().loading).toBe(false)
  })
})

describe('useAuth — logout', () => {
  it('clears accessToken and user after logout', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined)
    useAuth.setState({ accessToken: 'token-abc', user: mockUser, loading: false })

    await act(async () => { await getState().logout() })

    expect(getState().user).toBeNull()
    expect(getState().accessToken).toBeNull()
  })

  it('clears state even when logout API throws', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'))
    useAuth.setState({ accessToken: 'token-abc', user: mockUser, loading: false })

    await act(async () => {
      // logout() has try/finally — the error propagates after clearing state
      try { await getState().logout() } catch { /* expected */ }
    })

    expect(getState().user).toBeNull()
    expect(getState().accessToken).toBeNull()
  })
})

describe('useAuth — refresh', () => {
  it('restores session from cookie on refresh', async () => {
    vi.mocked(authApi.refreshToken).mockResolvedValue(mockLoginResponse)

    await act(async () => { await getState().refresh() })

    expect(getState().user).toEqual(mockUser)
    expect(getState().accessToken).toBe('token-abc')
  })

  it('clears state when refresh fails (session expired)', async () => {
    vi.mocked(authApi.refreshToken).mockRejectedValue(new Error('Expired'))
    useAuth.setState({ accessToken: 'old-token', user: mockUser, loading: false })

    await act(async () => { await getState().refresh() })

    expect(getState().user).toBeNull()
    expect(getState().accessToken).toBeNull()
  })

  it('deduplicates concurrent refresh calls (calls API only once)', async () => {
    let resolveRefresh!: (v: typeof mockLoginResponse) => void
    vi.mocked(authApi.refreshToken).mockReturnValue(new Promise((r) => { resolveRefresh = r }))

    // Call refresh twice concurrently before the first resolves
    const p1 = getState().refresh()
    const p2 = getState().refresh()

    await act(async () => {
      resolveRefresh(mockLoginResponse)
      await Promise.all([p1, p2])
    })

    // Despite two calls, refreshToken API should have been called only once
    expect(vi.mocked(authApi.refreshToken)).toHaveBeenCalledOnce()
    // Both calls resolve with the same token
    expect(await p1).toBe('token-abc')
    expect(await p2).toBe('token-abc')
  })
})

describe('useAuth — renderHook integration', () => {
  it('hook reflects store state', async () => {
    vi.mocked(authApi.login).mockResolvedValue(mockLoginResponse)
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login({ email: 'customer@event.local', password: 'Customer@123' })
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.accessToken).toBe('token-abc')
  })
})
