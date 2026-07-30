import { apiClient } from '../../../lib/apiClient'
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../types'

export async function login(request: LoginRequest) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', request)
  return data
}

export async function register(request: RegisterRequest) {
  const { data } = await apiClient.post<LoginResponse>('/auth/register', request)
  return data
}

export async function googleLogin(idToken: string) {
  const { data } = await apiClient.post<LoginResponse>('/auth/google', { idToken })
  return data
}

export async function refreshToken() {
  const { data } = await apiClient.post<LoginResponse>('/auth/refresh')
  return data
}

export async function logout() {
  await apiClient.post('/auth/logout')
}

export async function getMe() {
  const { data } = await apiClient.get<AuthUser>('/auth/me')
  return data
}
