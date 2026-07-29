import { apiClient } from '../../../lib/apiClient'
import type { PageResponse } from '../../events/types'
import type { CheckInLogItem, CheckInResult } from '../types'

export async function checkIn(qrCode: string, gateId: number) {
  const { data } = await apiClient.post<CheckInResult>('/checkin', { qrCode, gateId })
  return data
}

export async function listCheckInLogs(gateId: number, from: string, to: string, page = 0) {
  const { data } = await apiClient.get<PageResponse<CheckInLogItem>>('/checkin/logs', {
    params: { gateId, from, to, page, size: 20 },
  })
  return data
}
