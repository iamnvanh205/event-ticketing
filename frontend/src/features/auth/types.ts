export type Role = 'ADMIN' | 'ORGANIZER' | 'CHECKIN_STAFF' | 'CUSTOMER'
export type AuthProvider = 'LOCAL' | 'GOOGLE'

export interface AuthUser {
  id: number
  email: string
  role: Role
  provider?: AuthProvider
  fullName: string
  avatarUrl?: string | null
  assignedEventId?: number | null
  active?: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  fullName: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}
