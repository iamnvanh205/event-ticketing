import { useCallback, useEffect, useState } from 'react'
import { Activity, CalendarDays, DoorOpen, Plus, RefreshCw, Ticket, TicketCheck, WifiOff } from 'lucide-react'
import { PageTitle } from '../../../components/layout/PageTitle'
import { PageState } from '../../../components/ui/feedback'
import { dateOnly } from '../../../lib/format'
import { listEvents } from '../../events/api/eventApi'
import type { EventItem } from '../../events/types'
import { getDashboardSnapshot } from '../api/dashboardApi'
import { GateBreakdownTable } from '../components/GateBreakdownTable'
import { LiveStatsCard } from '../components/LiveStatsCard'
import { useDashboardSocket } from '../hooks/useDashboardSocket'
import type { DashboardSnapshot } from '../types'

interface Props {
  accessToken: string | null
  organizerId: number
  initialEventId?: number
  liveOnly?: boolean
}

export function OrganizerDashboardPage({ accessToken, organizerId, initialEventId, liveOnly = false }: Props) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventId, setEventId] = useState<number | null>(initialEventId ?? null)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEvents = useCallback(() => {
    listEvents()
      .then((items) => {
        const owned = items.filter((item) => item.organizerId === organizerId)
        setEvents(owned)
        setEventId((current) => current ?? owned[0]?.id ?? null)
        setError('')
      })
      .catch(() => setError('Could not load your events.'))
      .finally(() => setLoading(false))
  }, [organizerId])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const loadSnapshot = useCallback(() => {
    if (!eventId) return
    getDashboardSnapshot(eventId)
      .then((data) => {
        setSnapshot(data)
        setLastUpdated(new Date())
        setError('')
      })
      .catch(() => setError('Could not refresh live event data. The last snapshot remains visible.'))
  }, [eventId])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  const connected = useDashboardSocket(eventId, accessToken, loadSnapshot)
  const event = events.find((item) => item.id === eventId)
  const progress = snapshot?.totalTicketsSold
    ? Math.round((snapshot.totalCheckedIn / snapshot.totalTicketsSold) * 100)
    : 0

  return (
    <section className="page organizer-dashboard">
      <PageTitle
        eyebrow={liveOnly ? 'Live operations' : 'Organizer overview'}
        title={liveOnly ? 'Admission operations' : 'Your event command center'}
        description={liveOnly ? 'Monitor entry progress and gate activity without losing the last valid snapshot.' : 'See event health, inventory, and the next operational action at a glance.'}
        action={<a className="primary-action" href="/organizer/events/new"><Plus aria-hidden="true" size={18} />Create event</a>}
      />

      {loading && <div className="organizer-metric-grid" aria-label="Loading event metrics">{Array.from({ length: 4 }, (_, index) => <span className="skeleton metric-skeleton" key={index} />)}</div>}
      {!loading && error && events.length === 0 && <PageState kind="error" title="Could not load organizer workspace" description={error} action={<button className="outline-action" type="button" onClick={loadEvents}>Try again</button>} />}
      {!loading && !error && events.length === 0 && (
        <PageState
          title="Create your first event"
          description="Start with the event details, then add tickets, gates, and staff from one workspace."
          action={<a className="primary-action" href="/organizer/events/new">Create event</a>}
        />
      )}

      {events.length > 0 && (
        <>
          <section className="organizer-context surface" aria-labelledby="event-context-title">
            <div>
              <p className="eyebrow">Event context</p>
              <h2 id="event-context-title">{event?.name ?? 'Select an event'}</h2>
              {event && <p><CalendarDays aria-hidden="true" size={16} />{dateOnly.format(new Date(event.startTime))} · {event.location}</p>}
            </div>
            <label className="field event-selector">
              <span>Selected event</span>
              <select value={eventId ?? ''} onChange={(change) => setEventId(Number(change.target.value))}>
                {events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </section>

          <div className={`connection-banner ${connected ? 'connected' : 'stale'}`} role="status">
            {connected ? <Activity aria-hidden="true" size={18} /> : <WifiOff aria-hidden="true" size={18} />}
            <div>
              <strong>{connected ? 'Live updates connected' : 'Live updates disconnected'}</strong>
              <span>{lastUpdated ? `Last refreshed ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for the first snapshot'}</span>
            </div>
            <button className="icon-button" type="button" onClick={loadSnapshot} aria-label="Refresh event metrics"><RefreshCw aria-hidden="true" size={18} /></button>
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}

          {snapshot ? (
            <>
              <section className="organizer-metric-grid" aria-label="Event metrics">
                <LiveStatsCard icon={<Ticket aria-hidden="true" size={20} />} label="Tickets sold" value={snapshot.totalTicketsSold} />
                <LiveStatsCard icon={<TicketCheck aria-hidden="true" size={20} />} label="Checked in" value={snapshot.totalCheckedIn} />
                <LiveStatsCard icon={<Ticket aria-hidden="true" size={20} />} label="Remaining" value={snapshot.totalRemaining} />
                <LiveStatsCard icon={<DoorOpen aria-hidden="true" size={20} />} label="Active gates" value={snapshot.byGate.length} />
              </section>
              <section className="organizer-dashboard-grid">
                <GateBreakdownTable gates={snapshot.byGate} />
                <article className="dashboard-section flow-summary">
                  <div>
                    <p className="eyebrow">Admission progress</p>
                    <strong>{progress}%</strong>
                    <span>{snapshot.totalCheckedIn.toLocaleString()} of {snapshot.totalTicketsSold.toLocaleString()} sold tickets checked in</span>
                  </div>
                  <div className="progress-track" role="progressbar" aria-label="Admission progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <a className="outline-action" href={eventId ? `/organizer/events/${eventId}/live` : '/organizer/live'}>Open live operations</a>
                </article>
              </section>
            </>
          ) : !loading && <PageState kind="loading" title="Loading event metrics" description="Fetching the latest server snapshot." />}

          {!liveOnly && (
            <section className="owned-events-section">
              <div className="section-heading">
                <div><p className="eyebrow">Portfolio</p><h2>Upcoming events</h2></div>
                <a className="outline-action" href="/organizer/events">Manage all events</a>
              </div>
              <div className="owned-event-list">
                {events.slice(0, 4).map((item) => (
                  <a className="owned-event-row" href={`/organizer/events/${item.id}/overview`} key={item.id}>
                    <span className="event-date-block"><strong>{new Date(item.startTime).getDate()}</strong><span>{new Date(item.startTime).toLocaleString('en', { month: 'short' })}</span></span>
                    <span><strong>{item.name}</strong><small>{item.location}</small></span>
                    <span className={`status status-${item.status.toLowerCase()}`}>{item.status.toLowerCase()}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  )
}
