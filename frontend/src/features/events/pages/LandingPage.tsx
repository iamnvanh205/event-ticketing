import { useEffect, useState } from 'react'
import { ArrowRight, CalendarCheck, ScanLine, ShieldCheck } from 'lucide-react'
import { PageState } from '../../../components/ui/feedback'
import { EventCard, EventCardSkeleton } from '../components/EventCard'
import { listEvents } from '../api/eventApi'
import type { EventItem } from '../types'

export function LandingPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    listEvents()
      .then((items) => setEvents(items.filter((item) => item.status === 'PUBLISHED').slice(0, 4)))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">Events, without the friction</p>
          <h1>Find the room where it happens.</h1>
          <p>Discover thoughtful events, reserve in minutes, and keep every ticket ready when the doors open.</p>
          <form className="hero-search" action="/search" method="get" role="search">
            <label className="sr-only" htmlFor="landing-search">Search events</label>
            <input id="landing-search" name="q" placeholder="Search by event or location" type="search" />
            <button className="primary-action" type="submit">Explore events <ArrowRight aria-hidden="true" size={18} /></button>
          </form>
          <div className="trust-row" aria-label="Platform benefits">
            <span><CalendarCheck aria-hidden="true" size={17} />Clear event details</span>
            <span><ShieldCheck aria-hidden="true" size={17} />Secure reservations</span>
            <span><ScanLine aria-hidden="true" size={17} />Fast entry</span>
          </div>
        </div>
        <div className="hero-composition" aria-hidden="true">
          <div className="hero-orbit one" />
          <div className="hero-orbit two" />
          <div className="hero-ticket">
            <span>LIVE SESSION</span>
            <strong>Afterlight</strong>
            <small>SEP 18 · DISTRICT 1</small>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="upcoming-events">
        <header className="section-heading">
          <div>
            <p className="eyebrow">Coming up</p>
            <h2 id="upcoming-events">Worth leaving the house for</h2>
          </div>
          <a className="text-link" href="/events">View all events <ArrowRight aria-hidden="true" size={17} /></a>
        </header>
        {loading && <div className="event-grid">{Array.from({ length: 4 }, (_, index) => <EventCardSkeleton key={index} />)}</div>}
        {error && <PageState kind="error" title="Events are taking longer than expected" description="You can still open the complete event list and try again." action={<a className="outline-action" href="/events">Browse events</a>} />}
        {!loading && !error && <div className="event-grid">{events.map((event) => <EventCard event={event} key={event.id} />)}</div>}
      </section>

      <section className="organizer-callout">
        <div>
          <p className="eyebrow">For organizers</p>
          <h2>Run the event. See the room move.</h2>
          <p>Create inventory, prepare gates, assign staff, and follow admissions in real time from one focused workspace.</p>
        </div>
        <a className="primary-action" href="/auth">Start organizing <ArrowRight aria-hidden="true" size={18} /></a>
      </section>
    </>
  )
}
