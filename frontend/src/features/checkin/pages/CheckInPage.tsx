import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, CircleX, QrCode, ScanLine, Wifi } from 'lucide-react'
import { PageState } from '../../../components/ui/feedback'
import { getEvent, listEvents, listGates } from '../../events/api/eventApi'
import type { EventItem, GateItem } from '../../events/types'
import { checkIn } from '../api/checkinApi'
import { QrScanner } from '../components/QrScanner'
import type { CheckInResult } from '../types'

const errorMessages: Record<string, string> = {
  TICKET_ALREADY_CHECKED_IN: 'This ticket has already been checked in.',
  CHECKIN_STAFF_EVENT_MISMATCH: 'This ticket belongs to a different assigned event.',
  TICKET_NOT_CONFIRMED: 'This ticket is not ready for entry.',
  CHECKIN_OUTSIDE_WINDOW: 'Check-in is not open for this event.',
  GATE_EVENT_MISMATCH: 'The selected gate does not belong to this event.',
}

function messageForError(error: unknown) {
  const response = (error as { response?: { data?: { errorCode?: string }; status?: number } }).response
  const code = response?.data?.errorCode
  if (code && errorMessages[code]) return errorMessages[code]
  if (response?.status === 403) return 'You are not assigned to check in this event.'
  if (!response) return 'Network unavailable. Keep the code and try again.'
  return 'This code could not be validated. Check it and try again.'
}

export function CheckInPage({ assignedEventId }: { assignedEventId?: number | null }) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventId, setEventId] = useState<number | null>(assignedEventId ?? null)
  const [gates, setGates] = useState<GateItem[]>([])
  const [gateId, setGateId] = useState<number | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const manualInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const request = assignedEventId ? getEvent(assignedEventId).then((item) => [item]) : listEvents()
    request
      .then((items) => {
        setEvents(items)
        setEventId((current) => current ?? items[0]?.id ?? null)
      })
      .catch(() => setError('Could not load the assigned event.'))
  }, [assignedEventId])

  useEffect(() => {
    if (!eventId) return
    let active = true
    listGates(eventId)
      .then((items) => {
        if (!active) return
        setGates(items)
        const stored = Number(sessionStorage.getItem(`checkin-gate-${eventId}`))
        setGateId(items.some((gate) => gate.id === stored) ? stored : items[0]?.id ?? null)
      })
      .catch(() => {
        if (active) setError('Could not load admission gates.')
      })
    return () => { active = false }
  }, [eventId])

  const submit = useCallback(async (code: string) => {
    if (!gateId || !code.trim() || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const next = await checkIn(code.trim(), gateId)
      setResult(next)
      setQrCode('')
      setSessionCount((count) => count + 1)
    } catch (requestError) {
      setError(messageForError(requestError))
      setQrCode(code)
      requestAnimationFrame(() => manualInput.current?.focus())
    } finally {
      setBusy(false)
    }
  }, [busy, gateId])

  const event = events.find((item) => item.id === eventId)
  const gate = gates.find((item) => item.id === gateId)

  if (!event && error) return <section className="checkin-page"><PageState headingLevel={1} kind="error" title="Scanner unavailable" description={error} /></section>

  return (
    <section className="checkin-page">
      <header className="scanner-context">
        <div>
          <p className="eyebrow">Check-in station</p>
          <h1>{event?.name ?? 'Loading assigned event…'}</h1>
          <p><Wifi aria-hidden="true" size={15} />Ready to validate · {sessionCount} admitted this session</p>
        </div>
        <div className="scanner-selectors">
          {!assignedEventId && <label className="field">Event<select value={eventId ?? ''} onChange={(change) => setEventId(Number(change.target.value))}>{events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          <label className="field">Gate<select value={gateId ?? ''} onChange={(change) => {
            const next = Number(change.target.value)
            setGateId(next)
            if (eventId) sessionStorage.setItem(`checkin-gate-${eventId}`, String(next))
          }}>{gates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
      </header>

      <div className="scanner-layout">
        <section className="scanner-panel">
          <div className="scanner-viewport">
            <div className="scanner-corners" aria-hidden="true" />
            <QrScanner enabled={!busy} onScan={submit} />
            {busy && <div className="scanner-busy" role="status"><span className="spinner" />Validating ticket…</div>}
          </div>
          <div className="scanner-guidance"><ScanLine aria-hidden="true" size={18} /><span>Place the QR code inside the frame. Scanning pauses during validation.</span></div>
        </section>

        <aside className="scanner-side">
          {result ? (
            <section className="scan-outcome success" role="status">
              <span className="outcome-icon"><Check aria-hidden="true" size={32} /></span>
              <p className="eyebrow">Admit attendee</p>
              <h2>Ticket accepted</h2>
              <dl><div><dt>Ticket</dt><dd>#{result.ticketId}</dd></div><div><dt>Gate</dt><dd>{gate?.name ?? `#${result.gateId}`}</dd></div><div><dt>Time</dt><dd>{new Date(result.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</dd></div></dl>
              <button className="outline-action" type="button" onClick={() => setResult(null)}>Scan next ticket</button>
            </section>
          ) : error ? (
            <section className="scan-outcome error" role="alert">
              <span className="outcome-icon"><CircleX aria-hidden="true" size={32} /></span>
              <p className="eyebrow">Do not admit</p>
              <h2>Ticket not accepted</h2>
              <p>{error}</p>
              <button className="outline-action" type="button" onClick={() => { setError(''); manualInput.current?.focus() }}>Try another code</button>
            </section>
          ) : (
            <section className="scan-outcome waiting">
              <span className="outcome-icon"><QrCode aria-hidden="true" size={30} /></span>
              <p className="eyebrow">Ready</p>
              <h2>Waiting for a ticket</h2>
              <p>The validation result appears here with a clear admit or reject instruction.</p>
            </section>
          )}

          <form className="manual-checkin" onSubmit={(formEvent) => {
            formEvent.preventDefault()
            void submit(qrCode)
          }}>
            <div><AlertTriangle aria-hidden="true" size={17} /><strong>Camera unavailable?</strong></div>
            <label className="field">Ticket or QR code<input ref={manualInput} value={qrCode} onChange={(change) => setQrCode(change.target.value)} autoComplete="off" /></label>
            <button className="primary-action" disabled={busy || !gateId || !qrCode.trim()} type="submit"><QrCode aria-hidden="true" size={18} />Validate ticket</button>
          </form>
        </aside>
      </div>
    </section>
  )
}
