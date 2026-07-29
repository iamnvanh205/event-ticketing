import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, MapPin, QrCode, Ticket as TicketIcon, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { PageTitle } from '../../../components/layout/PageTitle'
import { PageState } from '../../../components/ui/feedback'
import { dateOnly, timeOnly } from '../../../lib/format'
import { getEvent, getTicketType } from '../../events/api/eventApi'
import type { EventItem, TicketTypeItem } from '../../events/types'
import { cancelTicket, listMyTickets } from '../api/ticketApi'
import { TicketStatus } from '../components/TicketStatus'
import type { TicketItem } from '../types'

interface DisplayContext {
  event?: EventItem
  ticketType?: TicketTypeItem
}

export function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [contexts, setContexts] = useState<Record<number, DisplayContext>>({})
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(() => {
    listMyTickets()
      .then(async (items) => {
        setError('')
        setTickets(items)
        const pairs = await Promise.all(items.map(async (ticket) => {
          try {
            const ticketType = await getTicketType(ticket.ticketTypeId)
            const event = await getEvent(ticketType.eventId)
            return [ticket.id, { ticketType, event }] as const
          } catch {
            return [ticket.id, {}] as const
          }
        }))
        setContexts(Object.fromEntries(pairs))
      })
      .catch(() => setError('Could not load tickets.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function cancel(ticketId: number) {
    setBusyId(ticketId)
    setActionError('')
    try {
      await cancelTicket(ticketId)
      load()
    } catch {
      setActionError('Ticket action failed. The reservation may have already changed.')
    } finally {
      setBusyId(null)
    }
  }

  const visibleTickets = useMemo(() => tickets.filter((ticket) => (
    view === 'upcoming'
      ? ticket.status === 'RESERVED' || ticket.status === 'CONFIRMED'
      : ticket.status === 'CHECKED_IN' || ticket.status === 'EXPIRED' || ticket.status === 'CANCELLED'
  )), [tickets, view])

  const nextTicket = visibleTickets.find((ticket) => ticket.status === 'CONFIRMED')

  return (
    <section className="page tickets-page">
      <PageTitle
        eyebrow="Ticket wallet"
        title="My Tickets"
        description="Your active reservations and entry passes, in one place."
        action={<span className="result-count">{tickets.length} total</span>}
      />
      <div className="ticket-tabs" role="tablist" aria-label="Ticket history">
        <button aria-selected={view === 'upcoming'} className={view === 'upcoming' ? 'active' : ''} role="tab" type="button" onClick={() => setView('upcoming')}>Upcoming</button>
        <button aria-selected={view === 'past'} className={view === 'past' ? 'active' : ''} role="tab" type="button" onClick={() => setView('past')}>Past & inactive</button>
      </div>
      {actionError && <p className="inline-error" role="alert">{actionError}</p>}
      {loading && <div className="ticket-wallet-grid" aria-label="Loading tickets">{Array.from({ length: 3 }, (_, index) => <span className="skeleton ticket-card-skeleton" key={index} />)}</div>}
      {error && <PageState kind="error" title="Could not load tickets" description="Your ticket wallet is temporarily unavailable." action={<button className="outline-action" type="button" onClick={load}>Try again</button>} />}
      {!loading && !error && visibleTickets.length === 0 && (
        <PageState
          title={view === 'upcoming' ? 'No upcoming tickets' : 'No ticket history yet'}
          description={view === 'upcoming' ? 'Find an event and your next ticket will appear here.' : 'Completed and inactive tickets will remain available here.'}
          action={view === 'upcoming' ? <a className="primary-action" href="/events">Discover events</a> : undefined}
        />
      )}
      {!loading && !error && visibleTickets.length > 0 && (
        <div className="ticket-wallet-grid">
          {visibleTickets.map((ticket) => {
            const context = contexts[ticket.id]
            const featured = nextTicket?.id === ticket.id
            return (
              <article className={`wallet-ticket ${featured ? 'featured' : ''}`} key={ticket.id}>
                <div className="wallet-ticket-copy">
                  <div className="wallet-ticket-status">
                    <TicketStatus status={ticket.status} />
                    <span>Ticket #{ticket.id}</span>
                  </div>
                  <h2>{context?.event?.name ?? 'Event details unavailable'}</h2>
                  <p>{context?.ticketType?.name ?? 'Event ticket'} · Quantity {ticket.quantity}</p>
                  {context?.event && (
                    <dl className="wallet-event-meta">
                      <div><CalendarDays aria-hidden="true" size={16} /><dt className="sr-only">Date</dt><dd>{dateOnly.format(new Date(context.event.startTime))}</dd></div>
                      <div><Clock3 aria-hidden="true" size={16} /><dt className="sr-only">Time</dt><dd>{timeOnly.format(new Date(context.event.startTime))}</dd></div>
                      <div><MapPin aria-hidden="true" size={16} /><dt className="sr-only">Location</dt><dd>{context.event.location}</dd></div>
                    </dl>
                  )}
                  <div className="row-actions">
                    {ticket.status === 'RESERVED' && (
                      <>
                        <a className="primary-action" href={`/checkout/${ticket.id}`}><TicketIcon aria-hidden="true" size={18} />Complete reservation</a>
                        <button className="outline-action" disabled={busyId === ticket.id} type="button" onClick={() => void cancel(ticket.id)}><X aria-hidden="true" size={18} />Cancel</button>
                      </>
                    )}
                    {ticket.status !== 'RESERVED' && <a className={featured ? 'primary-action' : 'outline-action'} href={`/tickets/${ticket.id}`}>{ticket.status === 'CONFIRMED' ? <QrCode aria-hidden="true" size={18} /> : <TicketIcon aria-hidden="true" size={18} />}View ticket</a>}
                  </div>
                </div>
                {ticket.status === 'CONFIRMED' && ticket.qrCode && (
                  <a className="wallet-qr" href={`/tickets/${ticket.id}`} aria-label={`Show ticket ${ticket.id} QR code`}>
                    <QRCodeSVG value={ticket.qrCode} title={`Ticket ${ticket.id} QR`} />
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
