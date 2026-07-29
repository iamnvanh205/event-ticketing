import { apiClient } from '../../../lib/apiClient'
import type { EventItem, EventRequest, GateItem, PageResponse, TicketTypeItem, TicketTypeRequest } from '../types'

export async function listEvents() {
  const { data } = await apiClient.get<PageResponse<EventItem>>('/events', {
    params: { page: 0, size: 50 },
    headers: { Authorization: null },
  })
  return data.content
}

export async function getEvent(id: number) {
  const { data } = await apiClient.get<EventItem>(`/events/${id}`, { headers: { Authorization: null } })
  return data
}

export async function createEvent(request: EventRequest) {
  const { data } = await apiClient.post<EventItem>('/events', request)
  return data
}

export async function updateEvent(id: number, request: EventRequest) {
  const { data } = await apiClient.put<EventItem>(`/events/${id}`, request)
  return data
}

export async function listTicketTypes(eventId: number) {
  const { data } = await apiClient.get<TicketTypeItem[]>(`/events/${eventId}/ticket-types`, {
    headers: { Authorization: null },
  })
  return data
}

export async function createTicketType(eventId: number, request: TicketTypeRequest) {
  const { data } = await apiClient.post<TicketTypeItem>(`/events/${eventId}/ticket-types`, request)
  return data
}

export async function getTicketType(id: number) {
  const { data } = await apiClient.get<TicketTypeItem>(`/ticket-types/${id}`)
  return data
}

export async function listGates(eventId: number) {
  const { data } = await apiClient.get<GateItem[]>(`/events/${eventId}/gates`)
  return data
}

export async function createGate(eventId: number, name: string) {
  const { data } = await apiClient.post<GateItem>(`/events/${eventId}/gates`, { name })
  return data
}
