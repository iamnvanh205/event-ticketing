import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Plus, Search } from 'lucide-react'
import { PageTitle } from '../../../components/layout/PageTitle'
import { PageState } from '../../../components/ui/feedback'
import { dateOnly } from '../../../lib/format'
import { listEvents } from '../../events/api/eventApi'
import type { EventItem } from '../../events/types'

type EventView = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'CANCELLED'

export function OrganizerEventsPage({ organizerId }: { organizerId: number }) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [query, setQuery] = useState('')
  const [view, setView] = useState<EventView>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listEvents()
      .then((items) => {
        if (active) setEvents(items.filter((item) => item.organizerId === organizerId))
      })
      .catch(() => {
        if (active) setError('Could not load your event portfolio.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [organizerId])

  const visible = useMemo(() => events.filter((event) => {
    const matchesStatus = view === 'ALL' || event.status === view
    const searchValue = `${event.name} ${event.location}`.toLowerCase()
    return matchesStatus && searchValue.includes(query.trim().toLowerCase())
  }), [events, query, view])

  return (
    <section className="page organizer-events-page">
      <PageTitle
        eyebrow="Event portfolio"
        title="Events"
        description="Find an owned event and continue directly in the section that needs attention."
        action={<a className="primary-action" href="/organizer/events/new"><Plus aria-hidden="true" size={18} />Create event</a>}
      />

      <div className="organizer-event-toolbar">
        <label className="search-field">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Search owned events</span>
          <input type="search" value={query} placeholder="Search events or locations" onChange={(change) => setQuery(change.target.value)} />
        </label>
        <div className="status-tabs" role="group" aria-label="Filter by event status">
          {(['ALL', 'DRAFT', 'PUBLISHED', 'CANCELLED'] as EventView[]).map((status) => (
            <button className={view === status ? 'active' : ''} aria-pressed={view === status} type="button" key={status} onClick={() => setView(status)}>
              {status === 'ALL' ? 'All' : status.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="owned-event-list" aria-label="Loading events">{Array.from({ length: 4 }, (_, index) => <span className="skeleton event-row-skeleton" key={index} />)}</div>}
      {!loading && error && <PageState kind="error" title="Could not load events" description={error} />}
      {!loading && !error && visible.length === 0 && (
        <PageState
          title={events.length ? 'No events match these filters' : 'No events yet'}
          description={events.length ? 'Clear the search or choose a different status.' : 'Create an event to begin configuring tickets and admission.'}
          action={events.length ? <button className="outline-action" type="button" onClick={() => { setQuery(''); setView('ALL') }}>Clear filters</button> : <a className="primary-action" href="/organizer/events/new">Create event</a>}
        />
      )}
      {!loading && !error && visible.length > 0 && (
        <div className="organizer-event-table" role="table" aria-label="Owned events">
          <div className="organizer-event-row event-table-head" role="row">
            <span role="columnheader">Event</span>
            <span role="columnheader">Date</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Action</span>
          </div>
          {visible.map((event) => (
            <div className="organizer-event-row" role="row" key={event.id}>
              <span className="event-cell" role="cell"><CalendarDays aria-hidden="true" size={18} /><span><strong>{event.name}</strong><small><MapPin aria-hidden="true" size={13} />{event.location}</small></span></span>
              <span role="cell" data-label="Date">{dateOnly.format(new Date(event.startTime))}</span>
              <span role="cell" data-label="Status"><span className={`status status-${event.status.toLowerCase()}`}>{event.status.toLowerCase()}</span></span>
              <span role="cell"><a className="outline-action" href={`/organizer/events/${event.id}/overview`}>Manage</a></span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
