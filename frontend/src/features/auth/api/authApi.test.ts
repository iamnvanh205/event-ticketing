import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { apiClient } from '../../../lib/apiClient'
import { googleLogin } from './authApi'

describe('authApi', () => {
  it('posts only the Google ID token to the backend', async () => {
    const originalAdapter = apiClient.defaults.adapter
    apiClient.defaults.adapter = ((config: InternalAxiosRequestConfig) => {
      expect(config.method).toBe('post')
      expect(config.url).toBe('/auth/google')
      expect(JSON.parse(config.data as string)).toEqual({ idToken: 'google-id-token' })
      return Promise.resolve({
        data: {
          accessToken: 'backend-jwt',
          user: {
            id: 1,
            email: 'customer@example.com',
            role: 'CUSTOMER',
            provider: 'GOOGLE',
            fullName: 'Customer',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    }) as AxiosAdapter

    try {
      const response = await googleLogin('google-id-token')

      expect(response.accessToken).toBe('backend-jwt')
      expect(response.user.provider).toBe('GOOGLE')
    } finally {
      apiClient.defaults.adapter = originalAdapter
    }
  })
})
