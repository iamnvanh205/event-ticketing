import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { PageTitle } from '../../../components/layout/PageTitle'
import { PageState } from '../../../components/ui/feedback'
import { EventCard, EventCardSkeleton } from '../components/EventCard'
import { listEvents } from '../api/eventApi'
import type { EventItem } from '../types'

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listEvents()
      .then((items) => setEvents(items.filter((item) => item.status === 'PUBLISHED')))
      .catch(() => setError('Could not load events. Check backend and PostgreSQL are running.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="page">
      <PageTitle
        eyebrow="Discover"
        title="Events that bring people together"
        description="Browse every published event currently open for discovery."
        action={<span className="result-count">{events.length} listed</span>}
      />
      <a className="discover-search" href="/search">
        <Search aria-hidden="true" size={20} />
        <span>Search by event or location</span>
        <kbd>/</kbd>
      </a>
      {loading && (
        <>
          <p className="sr-only" aria-live="polite">Loading events…</p>
          <div className="event-grid">{Array.from({ length: 6 }, (_, index) => <EventCardSkeleton key={index} />)}</div>
        </>
      )}
      {error && <PageState kind="error" title="Could not load events" description="The event service did not respond. Check the connection and try again." action={<button className="outline-action" type="button" onClick={() => window.location.reload()}>Try again</button>} />}
      {!loading && !error && events.length === 0 && <PageState title="No events found" description="There are no published events available right now. Please check back soon." />}
      {!loading && !error && <div className="event-grid">{events.map((event) => <EventCard event={event} key={event.id} />)}</div>}
    </section>
  )
}
