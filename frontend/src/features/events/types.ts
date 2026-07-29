export interface EventItem {
  id: number
  name: string
  description: string | null
  location: string
  organizerId: number
  status: string
  startTime: string
  endTime: string
  bannerUrl: string | null
  createdAt: string
}

export interface EventRequest {
  name: string
  description: string
  location: string
  startTime: string
  endTime: string
}

export interface TicketTypeItem {
  id: number
  eventId: number
  name: string
  price: number
  quantityTotal: number
  quantityRemaining: number
  salesStartAt: string
  salesEndAt: string
}

export interface TicketTypeRequest {
  name: string
  price: number
  quantityTotal: number
  salesStartAt: string
  salesEndAt: string
}

export interface GateItem {
  id: number
  eventId: number
  name: string
}

export interface EventStaffItem {
  id: number
  email: string
  fullName?: string
  role: string
  active?: boolean
  assignedEventId?: number
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
