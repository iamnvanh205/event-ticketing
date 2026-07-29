import { apiClient } from '../../../lib/apiClient'
import type { AuthUser } from '../../auth/types'
import type { PageResponse } from '../../events/types'

export async function listAdminUsers(page = 0) {
  const { data } = await apiClient.get<PageResponse<AuthUser>>('/users', { params: { page, size: 20 } })
  return data
}

export async function setAdminUserStatus(id: number, active: boolean) {
  const { data } = await apiClient.put<AuthUser>(`/users/${id}/status`, { active })
  return data
}
