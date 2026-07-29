import { useEffect, useState } from 'react'
import { getEvent, getTicketType } from '../../events/api/eventApi'
import type { EventItem, TicketTypeItem } from '../../events/types'
import { getTicket } from '../api/ticketApi'
import type { TicketItem } from '../types'

export interface TicketContext {
  ticket: TicketItem
  ticketType: TicketTypeItem
  event: EventItem
}

export function useTicketContext(ticketId: number) {
  const [context, setContext] = useState<TicketContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getTicket(ticketId)
      .then(async (ticket) => {
        const ticketType = await getTicketType(ticket.ticketTypeId)
        const event = await getEvent(ticketType.eventId)
        if (active) setContext({ ticket, ticketType, event })
      })
      .catch(() => {
        if (active) setError('Could not load this ticket.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [ticketId])

  return { context, loading, error, setContext }
}
