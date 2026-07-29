import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, LoaderCircle, MapPin, ShieldCheck, Ticket } from 'lucide-react'
import { PageState } from '../../../components/ui/feedback'
import { dateOnly, money, timeOnly } from '../../../lib/format'
import { navigate } from '../../../routes/navigation'
import type { AuthUser } from '../../auth/types'
import { cancelTicket, confirmTicket } from '../api/ticketApi'
import { TicketStatus } from '../components/TicketStatus'
import { useTicketContext } from '../hooks/useTicketContext'
import { formatCountdown, secondsUntil } from '../time'

export function CheckoutPage({ ticketId, user }: { ticketId: number; user: AuthUser }) {
  const { context, loading, error, setContext } = useTicketContext(ticketId)
  const [remaining, setRemaining] = useState(0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!context?.ticket.expiresAt || context.ticket.status !== 'RESERVED') return
    const update = () => setRemaining(secondsUntil(context.ticket.expiresAt))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [context?.ticket.expiresAt, context?.ticket.status])

  async function confirm() {
    if (!context || context.ticket.status !== 'RESERVED' || remaining === 0) return
    setBusy(true)
    setActionError('')
    try {
      const ticket = await confirmTicket(context.ticket.id)
      setContext({ ...context, ticket })
      navigate(`/orders/${ticket.id}/confirmation`)
    } catch {
      setActionError('The reservation could not be confirmed. It may have expired; refresh before trying again.')
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (!context) return
    setBusy(true)
    setActionError('')
    try {
      await cancelTicket(context.ticket.id)
      navigate(`/events/${context.event.id}`)
    } catch {
      setActionError('The reservation could not be cancelled. Refresh its status and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <section className="page"><PageState headingLevel={1} kind="loading" title="Loading checkout" description="Verifying your held ticket…" /></section>
  if (!context || error) return <section className="page"><PageState headingLevel={1} kind="error" title="Checkout unavailable" description={error || 'This reservation could not be found.'} action={<a className="outline-action" href="/tickets">Open My Tickets</a>} /></section>

  const { ticket, ticketType, event } = context
  if (ticket.status !== 'RESERVED') {
    return <section className="page"><PageState headingLevel={1} title={ticket.status === 'CONFIRMED' ? 'This ticket is already confirmed' : 'This reservation is no longer active'} description="Open the ticket wallet for its current status and next action." action={<a className="primary-action" href={`/tickets/${ticket.id}`}>View ticket</a>} /></section>
  }

  const expired = remaining === 0
  return (
    <section className="page checkout-page">
      <a className="back-link" href={`/events/${event.id}`}><ArrowLeft aria-hidden="true" size={17} />Back to event</a>
      <header className="checkout-heading">
        <div>
          <p className="eyebrow">Reservation checkout</p>
          <h1>Review and confirm</h1>
          <p>Your place is held while the timer is active.</p>
        </div>
        <div className={`reservation-timer ${remaining <= 120 ? 'warning' : ''}`} role="timer" aria-live={remaining === 120 || remaining === 0 ? 'assertive' : 'off'}>
          <Clock3 aria-hidden="true" size={20} />
          <span>{expired ? 'Reservation expired' : 'Time remaining'}</span>
          <strong>{formatCountdown(remaining)}</strong>
        </div>
      </header>

      <div className="checkout-layout">
        <div className="checkout-content">
          <section className="surface checkout-section">
            <p className="eyebrow">Attendee</p>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
          </section>
          <section className="surface checkout-section">
            <p className="eyebrow">Ticket</p>
            <div className="checkout-ticket-row">
              <span className="checkout-icon" aria-hidden="true"><Ticket size={20} /></span>
              <div><h2>{ticketType.name}</h2><p>Quantity {ticket.quantity}</p></div>
              <TicketStatus status={ticket.status} />
            </div>
          </section>
          <section className="checkout-note">
            <ShieldCheck aria-hidden="true" size={22} />
            <div>
              <strong>No payment is collected in this MVP</strong>
              <p>Confirming issues the ticket immediately using the existing reservation workflow.</p>
            </div>
          </section>
        </div>

        <aside className="order-summary">
          <p className="eyebrow">Order summary</p>
          <h2>{event.name}</h2>
          <dl className="summary-facts">
            <div><CalendarDays aria-hidden="true" size={17} /><dt className="sr-only">Date</dt><dd>{dateOnly.format(new Date(event.startTime))}</dd></div>
            <div><Clock3 aria-hidden="true" size={17} /><dt className="sr-only">Time</dt><dd>{timeOnly.format(new Date(event.startTime))}</dd></div>
            <div><MapPin aria-hidden="true" size={17} /><dt className="sr-only">Location</dt><dd>{event.location}</dd></div>
          </dl>
          <div className="summary-price"><span>{ticket.quantity} × {ticketType.name}</span><strong>{money.format(ticketType.price * ticket.quantity)}</strong></div>
          <div className="summary-total"><span>Total</span><strong>{money.format(ticketType.price * ticket.quantity)}</strong></div>
          {actionError && <p className="form-error" role="alert">{actionError}</p>}
          {expired && <p className="inline-note">This hold has ended. <a href={`/events/${event.id}`}>Return to the event</a> to check current availability.</p>}
          <button className="primary-action" disabled={busy || expired} type="button" onClick={() => void confirm()} aria-busy={busy}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" size={18} /> : <CheckCircle2 aria-hidden="true" size={18} />}
            {expired ? 'Reservation expired' : 'Confirm ticket'}
          </button>
          <button className="button-link" disabled={busy} type="button" onClick={() => void cancel()}>Cancel reservation</button>
        </aside>
      </div>
    </section>
  )
}
