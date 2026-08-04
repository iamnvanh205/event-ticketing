import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Copy, MapPin } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { BrandMark } from '../../../components/layout/BrandMark'
import { PageState } from '../../../components/ui/feedback'
import { dateOnly, timeOnly } from '../../../lib/format'
import { TicketStatus } from '../components/TicketStatus'
import { useTicketContext } from '../hooks/useTicketContext'

export function TicketDetailPage({ ticketId }: { ticketId: number }) {
  const { context, loading, error } = useTicketContext(ticketId)
  if (loading) return <section className="page"><PageState headingLevel={1} kind="loading" title="Loading ticket" description="Checking its current entry status…" /></section>
  if (!context || error) return <section className="page"><PageState headingLevel={1} kind="error" title="Ticket unavailable" description="This ticket could not be found in your account." action={<a className="outline-action" href="/tickets">Open My Tickets</a>} /></section>

  const { ticket, ticketType, event } = context
  const canEnter = ticket.status === 'CONFIRMED' && ticket.qrCode

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(String(ticket.id))
      toast.success('Ticket reference copied')
    } catch {
      toast.error('Could not copy the ticket reference')
    }
  }

  return (
    <section className="page ticket-detail-page">
      <a className="back-link" href="/tickets"><ArrowLeft aria-hidden="true" size={17} />My Tickets</a>
      <header className="ticket-detail-heading">
        <div><p className="eyebrow">Ticket #{ticket.id}</p><h1>{event.name}</h1></div>
        <TicketStatus status={ticket.status} />
      </header>
      <div className="ticket-detail-layout">
        <section className={`admission-pass ${canEnter ? 'valid' : ''}`}>
          <div className="admission-pass-header">
            <BrandMark />
            <TicketStatus status={ticket.status} />
          </div>
          {canEnter ? (
            <div className="ticket-qr">
              <QRCodeSVG value={ticket.qrCode!} title={`QR code for ticket ${ticket.id} to ${event.name}`} />
              <p>Present this code at the assigned event gate.</p>
            </div>
          ) : (
            <div className="ticket-unavailable">
              <CheckCircle2 aria-hidden="true" size={32} />
              <strong>{ticket.status === 'CHECKED_IN' ? 'Entry completed' : 'QR code unavailable'}</strong>
              <p>{ticket.status === 'RESERVED' ? 'Confirm this reservation before presenting it for entry.' : 'This ticket cannot currently be used for entry.'}</p>
            </div>
          )}
          <div className="pass-cut" />
          <div className="pass-reference">
            <span>Ticket reference</span>
            <strong>#{ticket.id}</strong>
            <button className="icon-button" type="button" onClick={() => void copyReference()} aria-label="Copy ticket reference"><Copy aria-hidden="true" size={17} /></button>
          </div>
        </section>
        <aside className="surface ticket-event-details">
          <p className="eyebrow">Event details</p>
          <h2>{ticketType.name}</h2>
          <dl className="summary-facts">
            <div><CalendarDays aria-hidden="true" size={18} /><dt>Date</dt><dd>{dateOnly.format(new Date(event.startTime))}</dd></div>
            <div><Clock3 aria-hidden="true" size={18} /><dt>Time</dt><dd>{timeOnly.format(new Date(event.startTime))}</dd></div>
            <div><MapPin aria-hidden="true" size={18} /><dt>Venue</dt><dd>{event.location}</dd></div>
          </dl>
          <div className="ticket-quantity"><span>Quantity</span><strong>{ticket.quantity}</strong></div>
          {ticket.checkedInAt && <p className="checkin-time">Checked in {new Date(ticket.checkedInAt).toLocaleString()}</p>}
        </aside>
      </div>
    </section>
  )
}
