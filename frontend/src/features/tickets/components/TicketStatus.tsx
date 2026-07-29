import { StatusBadge } from '../../../components/ui/feedback'
import type { TicketStatus as TicketStatusValue } from '../types'

const labels: Record<TicketStatusValue, string> = {
  RESERVED: 'Held',
  CONFIRMED: 'Ready for entry',
  CHECKED_IN: 'Checked in',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

export function TicketStatus({ status }: { status: TicketStatusValue }) {
  return <StatusBadge status={status}>{labels[status]}</StatusBadge>
}
