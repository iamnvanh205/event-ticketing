import { create } from 'zustand'
import { setAccessToken, setRefreshAccessToken } from '../../../lib/apiClient'
import * as authApi from '../api/authApi'
import type { AuthUser, LoginRequest, RegisterRequest } from '../types'

let refreshPromise: Promise<string | null> | null = null

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  loading: boolean
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
  refresh: () => Promise<string | null>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  loading: false,

  async login(request) {
    set({ loading: true })
    try {
      const response = await authApi.login(request)
      setAccessToken(response.accessToken)
      set({ accessToken: response.accessToken, user: response.user })
    } finally {
      set({ loading: false })
    }
  },

  async register(request) {
    set({ loading: true })
    try {
      const response = await authApi.register(request)
      setAccessToken(response.accessToken)
      set({ accessToken: response.accessToken, user: response.user })
    } finally {
      set({ loading: false })
    }
  },

  async googleLogin(idToken) {
    set({ loading: true })
    try {
      const response = await authApi.googleLogin(idToken)
      setAccessToken(response.accessToken)
      set({ accessToken: response.accessToken, user: response.user })
    } finally {
      set({ loading: false })
    }
  },

  async refresh() {
    refreshPromise ??= (async () => {
      try {
        const response = await authApi.refreshToken()
        setAccessToken(response.accessToken)
        set({ accessToken: response.accessToken, user: response.user })
        return response.accessToken
      } catch {
        setAccessToken(null)
        set({ accessToken: null, user: null })
        return null
      } finally {
        refreshPromise = null
      }
    })()
    return refreshPromise
  },

  async logout() {
    try {
      await authApi.logout()
    } finally {
      setAccessToken(null)
      set({ accessToken: null, user: null })
    }
  },
}))

setRefreshAccessToken(() => useAuth.getState().refresh())
