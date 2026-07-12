import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { apiClient, setRefreshAccessToken } from './apiClient'

function reject401(config: InternalAxiosRequestConfig) {
  return Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
    config,
    data: {},
    headers: {},
    status: 401,
    statusText: 'Unauthorized',
  }))
}

describe('apiClient auth refresh interceptor', () => {
  it('does not recursively refresh a failed refresh request', async () => {
    const refresh = vi.fn()
    const originalAdapter = apiClient.defaults.adapter
    apiClient.defaults.adapter = reject401 as AxiosAdapter
    setRefreshAccessToken(refresh)

    try {
      await expect(apiClient.post('/auth/refresh')).rejects.toBeInstanceOf(axios.AxiosError)
      expect(refresh).not.toHaveBeenCalled()
    } finally {
      apiClient.defaults.adapter = originalAdapter
    }
  })
})
