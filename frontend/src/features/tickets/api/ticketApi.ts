import { apiClient } from '../../../lib/apiClient'
import type { TicketItem } from '../types'

export async function reserveTicket(ticketTypeId: number, quantity: number) {
  const { data } = await apiClient.post<TicketItem>(
    '/tickets/reserve',
    { ticketTypeId, quantity },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return data
}

export async function confirmTicket(ticketId: number) {
  const { data } = await apiClient.post<TicketItem>(`/tickets/${ticketId}/confirm`)
  return data
}

export async function cancelTicket(ticketId: number) {
  await apiClient.post(`/tickets/${ticketId}/cancel`)
}

export async function listMyTickets() {
  const { data } = await apiClient.get<TicketItem[]>('/tickets/my')
  return data
}

export async function getTicket(ticketId: number) {
  const { data } = await apiClient.get<TicketItem>(`/tickets/${ticketId}`)
  return data
}
