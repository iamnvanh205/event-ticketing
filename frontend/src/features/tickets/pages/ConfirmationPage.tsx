import { CalendarPlus, CheckCircle2, Ticket } from 'lucide-react'
import { PageState } from '../../../components/ui/feedback'
import { dateTime } from '../../../lib/format'
import { useTicketContext } from '../hooks/useTicketContext'

export function ConfirmationPage({ ticketId }: { ticketId: number }) {
  const { context, loading, error } = useTicketContext(ticketId)
  if (loading) return <section className="page"><PageState kind="loading" title="Preparing your ticket" description="Confirming the latest ticket status…" /></section>
  if (!context || error) return <section className="page"><PageState kind="error" title="Confirmation unavailable" description="Open My Tickets to check the latest status." action={<a className="outline-action" href="/tickets">Open My Tickets</a>} /></section>
  if (context.ticket.status !== 'CONFIRMED') return <section className="page"><PageState title="This ticket is not confirmed" description="Return to My Tickets for the current reservation status." action={<a className="outline-action" href="/tickets">Open My Tickets</a>} /></section>

  return (
    <section className="page confirmation-page">
      <div className="confirmation-mark" aria-hidden="true"><CheckCircle2 size={36} /></div>
      <p className="eyebrow">Ticket confirmed</p>
      <h1>You’re on the list.</h1>
      <p>Your ticket for <strong>{context.event.name}</strong> is ready. The event starts {dateTime.format(new Date(context.event.startTime))}.</p>
      <div className="confirmation-actions">
        <a className="primary-action" href={`/tickets/${context.ticket.id}`}><Ticket aria-hidden="true" size={18} />View ticket</a>
        <a className="outline-action" href={`/events/${context.event.id}`}><CalendarPlus aria-hidden="true" size={18} />Event details</a>
      </div>
      <span className="confirmation-reference">Ticket reference #{context.ticket.id}</span>
    </section>
  )
}
