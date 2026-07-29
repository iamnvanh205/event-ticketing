import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { PageTitle } from '../../../components/layout/PageTitle'
import { PageState } from '../../../components/ui/feedback'
import { navigate, useLocationSearch } from '../../../routes/navigation'
import { EventCard, EventCardSkeleton } from '../components/EventCard'
import { listEvents } from '../api/eventApi'
import type { EventItem } from '../types'

export function SearchPage() {
  const locationSearch = useLocationSearch()
  const params = new URLSearchParams(locationSearch)
  const initialQuery = params.get('q')?.trim() ?? ''
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    return listEvents()
      .then((items) => setEvents(items.filter((item) => item.status === 'PUBLISHED')))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  function retry() {
    setLoading(true)
    setError(false)
    void load()
  }

  const results = useMemo(() => {
    const term = initialQuery.toLocaleLowerCase()
    if (!term) return events
    return events.filter((event) => [event.name, event.location, event.description].some((value) => value?.toLocaleLowerCase().includes(term)))
  }, [events, initialQuery])

  return (
    <section className="page">
      <PageTitle
        eyebrow="Search"
        title={initialQuery ? `Results for “${initialQuery}”` : 'Find your next event'}
        description="Search the currently published event collection by name, description, or location."
        action={<span className="result-count" aria-live="polite">{loading ? 'Searching…' : `${results.length} results`}</span>}
      />
      <form className="search-toolbar" key={locationSearch} role="search" onSubmit={search}>
        <label className="search-field" htmlFor="event-search">
          <Search aria-hidden="true" size={20} />
          <span className="sr-only">Search events</span>
          <input defaultValue={initialQuery} id="event-search" name="q" placeholder="Event, venue, or city" type="search" />
        </label>
        <button className="primary-action" type="submit">Search</button>
      </form>
      {initialQuery && <div className="active-filters"><a href="/search">“{initialQuery}” <X aria-hidden="true" size={14} /><span className="sr-only">Clear search</span></a></div>}
      {loading && <div className="event-grid" aria-busy="true" aria-label="Loading events">{Array.from({ length: 6 }, (_, index) => <EventCardSkeleton key={index} />)}</div>}
      {error && <PageState kind="error" title="Search is unavailable" description="Your search is preserved. Try again when the connection is restored." action={<button className="outline-action" type="button" onClick={retry}>Try again</button>} />}
      {!loading && !error && results.length === 0 && <PageState title="No events match this search" description="Try a broader event name or location." action={<a className="outline-action" href="/search">Clear search</a>} />}
      {!loading && !error && results.length > 0 && <div className="event-grid">{results.map((event) => <EventCard event={event} key={event.id} />)}</div>}
    </section>
  )
}
