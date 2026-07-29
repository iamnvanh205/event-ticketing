import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { dateOnly } from '../../../lib/format'
import { navigate } from '../../../routes/navigation'
import type { EventItem } from '../types'

export function EventCard({ event }: { event: EventItem }) {
  return (
    <article className="event-card interactive-surface">
      <div className="event-card-media">
        {event.bannerUrl
          ? <img alt={`${event.name} banner`} src={event.bannerUrl} />
          : <div className="banner-fallback" role="img" aria-label={`${event.name} event artwork`} />}
        <span className="event-date-tile" aria-hidden="true">
          <strong>{new Date(event.startTime).toLocaleDateString('en', { day: '2-digit' })}</strong>
          <small>{new Date(event.startTime).toLocaleDateString('en', { month: 'short' })}</small>
        </span>
      </div>
      <div className="event-card-body">
        <span className="status published">Published</span>
        <h2>{event.name}</h2>
        <p className="event-card-description">{event.description ?? 'Event details will be announced soon.'}</p>
        <dl className="event-meta">
          <div><CalendarDays aria-hidden="true" size={16} /><dt className="sr-only">Date</dt><dd>{dateOnly.format(new Date(event.startTime))}</dd></div>
          <div><MapPin aria-hidden="true" size={16} /><dt className="sr-only">Location</dt><dd>{event.location}</dd></div>
        </dl>
        <button className="event-card-link" type="button" onClick={() => navigate(`/events/${event.id}`)}>
          View tickets <ArrowUpRight aria-hidden="true" size={17} />
        </button>
      </div>
    </article>
  )
}

export function EventCardSkeleton() {
  return (
    <article className="event-card" aria-hidden="true">
      <span className="skeleton event-card-skeleton-media" />
      <div className="event-card-body">
        <span className="skeleton skeleton-badge" />
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-line" />
        <span className="skeleton skeleton-line short" />
      </div>
    </article>
  )
}
