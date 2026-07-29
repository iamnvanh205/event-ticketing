import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Clock3, DoorOpen, Search } from 'lucide-react'
import { PageTitle } from '../../../components/layout/PageTitle'
import { PageState } from '../../../components/ui/feedback'
import { getEvent, listEvents, listGates } from '../../events/api/eventApi'
import type { EventItem, GateItem } from '../../events/types'
import { listCheckInLogs } from '../api/checkinApi'
import type { CheckInLogItem } from '../types'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function CheckInHistoryPage({ assignedEventId, organizerId }: { assignedEventId?: number | null; organizerId?: number }) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventId, setEventId] = useState<number | null>(assignedEventId ?? null)
  const [gates, setGates] = useState<GateItem[]>([])
  const [gateId, setGateId] = useState<number | null>(null)
  const [date, setDate] = useState(today())
  const [query, setQuery] = useState('')
  const [logs, setLogs] = useState<CheckInLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const request = assignedEventId ? getEvent(assignedEventId).then((item) => [item]) : listEvents()
    request.then((items) => {
      const allowed = organizerId ? items.filter((item) => item.organizerId === organizerId) : items
      setEvents(allowed)
      setEventId((current) => current ?? allowed[0]?.id ?? null)
      if (allowed.length === 0) setLoading(false)
    }).catch(() => {
      setError('Could not load available events.')
      setLoading(false)
    })
  }, [assignedEventId, organizerId])

  useEffect(() => {
    if (!eventId) return
    listGates(eventId).then((items) => {
      setGates(items)
      setGateId(items[0]?.id ?? null)
      if (items.length === 0) setLoading(false)
    }).catch(() => {
      setError('Could not load event gates.')
      setLoading(false)
    })
  }, [eventId])

  useEffect(() => {
    if (!gateId) return
    const from = new Date(`${date}T00:00:00`)
    const to = new Date(`${date}T23:59:59.999`)
    listCheckInLogs(gateId, from.toISOString(), to.toISOString())
      .then((page) => {
        setLogs(page.content)
        setError('')
      })
      .catch(() => setError('Could not load check-in history.'))
      .finally(() => setLoading(false))
  }, [date, gateId])

  const visible = useMemo(() => logs.filter((log) => String(log.ticketId).includes(query.trim())), [logs, query])
  const event = events.find((item) => item.id === eventId)

  return (
    <section className="page checkin-history-page">
      <PageTitle eyebrow="Admission records" title="Check-in history" description="Review completed scans by event, gate, date, and ticket reference." />
      <section className="history-context surface">
        <label className="field">Event<select value={eventId ?? ''} disabled={Boolean(assignedEventId)} onChange={(change) => { setLoading(true); setError(''); setGateId(null); setGates([]); setEventId(Number(change.target.value)) }}>{events.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="field">Gate<select value={gateId ?? ''} onChange={(change) => { setLoading(true); setGateId(Number(change.target.value)) }}>{gates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="field">Date<input max={today()} type="date" value={date} onChange={(change) => { setLoading(true); setDate(change.target.value) }} /></label>
        <label className="search-field" htmlFor="history-search"><Search aria-hidden="true" size={18} /><span className="sr-only">Search ticket reference</span><input id="history-search" type="search" value={query} placeholder="Ticket number" onChange={(change) => setQuery(change.target.value)} /></label>
      </section>

      {loading && <div className="history-list" aria-busy="true" aria-label="Loading check-in history">{Array.from({ length: 5 }, (_, index) => <span className="skeleton history-row-skeleton" key={index} />)}</div>}
      {!loading && error && <PageState kind="error" title="Could not load history" description={error} />}
      {!loading && !error && events.length === 0 && <PageState title="No events available" description="There is no assigned or owned event to review yet." />}
      {!loading && !error && events.length > 0 && gates.length === 0 && <PageState title="No admission gates" description="Check-in history will appear after a gate is configured for this event." />}
      {!loading && !error && gates.length > 0 && visible.length === 0 && <PageState title="No check-ins found" description={`No matching admission records were returned for ${event?.name ?? 'this event'} on this date.`} />}
      {!loading && !error && visible.length > 0 && (
        <div className="history-table" role="table" aria-label="Check-in records">
          <div className="history-row history-head" role="row"><span role="columnheader">Result</span><span role="columnheader">Ticket</span><span role="columnheader">Gate</span><span role="columnheader">Time</span></div>
          {visible.map((log, index) => (
            <div className="history-row" role="row" key={log.id ?? `${log.ticketId}-${log.checkedInAt}-${index}`}>
              <span role="cell" data-label="Result"><span className={`status ${(log.result ?? log.status).toLowerCase()}`}><Check aria-hidden="true" size={13} />{(log.result ?? log.status).replaceAll('_', ' ').toLowerCase()}</span></span>
              <span role="cell" data-label="Ticket">#{log.ticketId}</span>
              <span role="cell" data-label="Gate"><DoorOpen aria-hidden="true" size={15} />{gates.find((gate) => gate.id === log.gateId)?.name ?? `Gate #${log.gateId}`}</span>
              <time role="cell" data-label="Time" dateTime={log.checkedInAt}><Clock3 aria-hidden="true" size={15} />{new Date(log.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
            </div>
          ))}
        </div>
      )}
      <p className="history-caption"><CalendarDays aria-hidden="true" size={14} />Showing server-confirmed records for the selected local day.</p>
    </section>
  )
}
