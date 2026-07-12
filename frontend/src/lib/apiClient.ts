import axios from 'axios'

let accessToken: string | null = null
let refreshAccessToken: (() => Promise<string | null>) | null = null

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  if (config.headers.Authorization === null) {
    delete config.headers.Authorization
  } else if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original?.url?.includes('/auth/refresh') || original?._retry || !refreshAccessToken) {
      throw error
    }
    original._retry = true
    const token = await refreshAccessToken()
    if (!token) {
      throw error
    }
    original.headers.Authorization = `Bearer ${token}`
    return apiClient(original)
  },
)

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setRefreshAccessToken(handler: () => Promise<string | null>) {
  refreshAccessToken = handler
}
