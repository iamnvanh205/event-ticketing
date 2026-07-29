import { useEffect, useState } from 'react'
import { CalendarDays, ChevronRight, Clock3, LoaderCircle, MapPin, ShieldCheck, Ticket } from 'lucide-react'
import { PageState, StatusBadge } from '../../../components/ui/feedback'
import { dateOnly, money, timeOnly } from '../../../lib/format'
import { navigate } from '../../../routes/navigation'
import { reserveTicket } from '../../tickets/api/ticketApi'
import { getEvent, listTicketTypes } from '../api/eventApi'
import type { EventItem, TicketTypeItem } from '../types'

interface EventDetailPageProps {
  eventId: number
  signedIn: boolean
}

export function EventDetailPage({ eventId, signedIn }: EventDetailPageProps) {
  const [event, setEvent] = useState<EventItem | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getEvent(eventId), listTicketTypes(eventId)])
      .then(([eventData, ticketData]) => {
        setEvent(eventData)
        setTicketTypes(ticketData)
      })
      .catch(() => setError('Could not load event.'))
      .finally(() => setLoading(false))
  }, [eventId])

  async function reserve(ticketTypeId: number) {
    if (!signedIn) {
      sessionStorage.setItem('returnTo', `/events/${eventId}`)
      navigate('/auth')
      return
    }
    setBusy(true)
    setError('')
    try {
      const ticket = await reserveTicket(ticketTypeId, 1)
      navigate(`/checkout/${ticket.id}`)
    } catch {
      setError('Could not reserve this ticket. Availability may have changed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <section className="page"><PageState kind="loading" title="Loading event" description="Checking event details and current ticket availability…" /></section>
  }
  if (!event || error && !event) {
    return <section className="page"><PageState kind="error" title="Could not load event" description="This event could not be opened. It may no longer be available." action={<a className="outline-action" href="/events">Back to events</a>} /></section>
  }
  if (event.status !== 'PUBLISHED') {
    return <section className="page"><PageState title="This event is not available" description="The organizer has not published this event for attendees." action={<a className="outline-action" href="/events">Browse events</a>} /></section>
  }

  return (
    <section className="page event-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href="/events">Events</a><ChevronRight aria-hidden="true" size={14} /><span aria-current="page">{event.name}</span>
      </nav>

      <div className="event-hero">
        {event.bannerUrl
          ? <img alt={`${event.name} banner`} src={event.bannerUrl} />
          : <div className="banner-fallback large" role="img" aria-label={`${event.name} event artwork`} />}
      </div>

      <section className="event-heading">
        <div>
          <StatusBadge status={event.status}>Published</StatusBadge>
          <h1>{event.name}</h1>
          <p>{event.description ?? 'The organizer will share more details soon.'}</p>
        </div>
        <dl className="event-facts">
          <div><CalendarDays aria-hidden="true" /><dt>Date</dt><dd>{dateOnly.format(new Date(event.startTime))}</dd></div>
          <div><Clock3 aria-hidden="true" /><dt>Time</dt><dd>{timeOnly.format(new Date(event.startTime))}–{timeOnly.format(new Date(event.endTime))}</dd></div>
          <div><MapPin aria-hidden="true" /><dt>Location</dt><dd>{event.location}</dd></div>
        </dl>
      </section>

      <section className="detail-layout">
        <article className="event-detail">
          <p className="eyebrow">About this event</p>
          <h2>A clear plan for your time</h2>
          <p>{event.description ?? 'Full event details will be announced by the organizer.'}</p>
          <div className="event-assurance">
            <ShieldCheck aria-hidden="true" size={22} />
            <div><strong>Reservation protected</strong><span>Your place is held temporarily while you confirm.</span></div>
          </div>
        </article>

        <aside className="ticket-panel" aria-labelledby="ticket-types-heading">
          <div>
            <p className="eyebrow">Admission</p>
            <h2 id="ticket-types-heading">Choose a ticket</h2>
          </div>
          {ticketTypes.length === 0 && <p className="ticket-empty">Tickets are not available yet.</p>}
          {ticketTypes.map((ticketType) => {
            const soldOut = ticketType.quantityRemaining < 1
            return (
              <div className={`ticket-type ${soldOut ? 'sold-out' : ''}`} key={ticketType.id}>
                <div className="ticket-type-heading">
                  <div>
                    <strong>{ticketType.name}</strong>
                    <span>{soldOut ? 'Sold out' : `${ticketType.quantityRemaining} remaining`}</span>
                  </div>
                  <p>{money.format(ticketType.price)}</p>
                </div>
                <button className={soldOut ? 'outline-action' : 'primary-action'} disabled={busy || soldOut} type="button" onClick={() => void reserve(ticketType.id)}>
                  {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" size={18} /> : <Ticket aria-hidden="true" size={18} />}
                  {soldOut ? 'Sold out' : 'Reserve'}
                </button>
              </div>
            )
          })}
          {error && <p className="form-error" role="alert">{error}</p>}
        </aside>
      </section>
    </section>
  )
}
