export type Role = 'ADMIN' | 'ORGANIZER' | 'CHECKIN_STAFF' | 'CUSTOMER'

export interface AuthUser {
  id: number
  email: string
  role: Role
  fullName: string
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
