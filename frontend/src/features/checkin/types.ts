export interface CheckInResult {
  ticketId: number
  status: string
  checkedInAt: string
  gateId: number
}

export interface CheckInLogItem extends CheckInResult {
  id?: number
  staffId?: number
  result?: string
}
