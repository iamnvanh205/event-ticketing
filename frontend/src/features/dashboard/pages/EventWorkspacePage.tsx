import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Check, DoorOpen, Eye, Image, Plus, Ticket, Users } from 'lucide-react'
import { PageState } from '../../../components/ui/feedback'
import { money } from '../../../lib/format'
import { navigate } from '../../../routes/navigation'
import {
  createEvent,
  createEventStaff,
  createGate,
  createTicketType,
  getEvent,
  listEventStaff,
  listGates,
  listTicketTypes,
  updateEvent,
  uploadEventBanner,
} from '../../events/api/eventApi'
import type { EventItem, EventStaffItem, GateItem, TicketTypeItem } from '../../events/types'

const sections = ['overview', 'details', 'tickets', 'gates', 'staff', 'publishing'] as const
type WorkspaceSection = typeof sections[number]

function localDateTime(value: string) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function EventWorkspacePage({ eventId, section = 'overview' }: { eventId?: number; section?: string }) {
  const activeSection: WorkspaceSection = sections.includes(section as WorkspaceSection) ? section as WorkspaceSection : 'overview'
  const [event, setEvent] = useState<EventItem | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([])
  const [gates, setGates] = useState<GateItem[]>([])
  const [staff, setStaff] = useState<EventStaffItem[]>([])
  const [loading, setLoading] = useState(Boolean(eventId))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    if (!eventId) return
    Promise.all([getEvent(eventId), listTicketTypes(eventId), listGates(eventId), listEventStaff(eventId)])
      .then(([eventData, ticketData, gateData, staffData]) => {
        setEvent(eventData)
        setTicketTypes(ticketData)
        setGates(gateData)
        setStaff(staffData)
        setError('')
      })
      .catch(() => setError('Could not load this event workspace.'))
      .finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <section className="page"><PageState kind="loading" title="Loading event workspace" description="Fetching details, tickets, gates, and staff." /></section>
  if (eventId && error && !event) return <section className="page"><PageState kind="error" title="Could not open event" description={error} action={<a className="outline-action" href="/organizer/events">Back to events</a>} /></section>

  const base = eventId ? `/organizer/events/${eventId}` : '/organizer/events/new'

  return (
    <section className="page workspace-page">
      <a className="back-link" href="/organizer/events"><ArrowLeft aria-hidden="true" size={16} />All events</a>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">{eventId ? 'Event workspace' : 'New event'}</p>
          <h1>{event?.name ?? 'Create an event'}</h1>
          <p>{eventId ? 'Manage every attendee-facing and operational detail from one place.' : 'Start with the essentials. Tickets and operations unlock after the event is saved.'}</p>
        </div>
        <div className="workspace-status">
          {notice && <span className="save-state" role="status"><Check aria-hidden="true" size={15} />{notice}</span>}
          {event && <span className={`status status-${event.status.toLowerCase()}`}>{event.status.toLowerCase()}</span>}
        </div>
      </header>

      {eventId && (
        <nav className="workspace-nav" aria-label="Event workspace sections">
          {sections.map((item) => <a aria-current={activeSection === item ? 'page' : undefined} className={activeSection === item ? 'active' : ''} href={`${base}/${item}`} key={item}>{item}</a>)}
        </nav>
      )}

      {error && <p className="inline-error" role="alert">{error}</p>}

      <div className="workspace-layout">
        <main className="workspace-main">
          {(!eventId || activeSection === 'details') && <EventDetailsForm item={event} onSaved={(saved) => {
            setEvent(saved)
            setNotice(eventId ? 'Changes saved' : 'Event created')
            if (!eventId) navigate(`/organizer/events/${saved.id}/tickets`)
          }} onError={setError} />}
          {eventId && activeSection === 'overview' && <WorkspaceOverview item={event!} tickets={ticketTypes} gates={gates} staff={staff} />}
          {eventId && activeSection === 'tickets' && <TicketSection eventId={eventId} items={ticketTypes} onCreated={load} onError={setError} />}
          {eventId && activeSection === 'gates' && <GateSection eventId={eventId} items={gates} onCreated={load} onError={setError} />}
          {eventId && activeSection === 'staff' && <StaffSection eventId={eventId} items={staff} onCreated={load} onError={setError} />}
          {eventId && activeSection === 'publishing' && <PublishingSection item={event!} tickets={ticketTypes} gates={gates} />}
        </main>
        <aside className="workspace-aside">
          <p className="eyebrow">Completion</p>
          <h2>Event readiness</h2>
          <ul className="readiness-list">
            <li className={event ? 'complete' : ''}><Check aria-hidden="true" size={15} />Event details</li>
            <li className={ticketTypes.length ? 'complete' : ''}><Check aria-hidden="true" size={15} />At least one ticket type</li>
            <li className={gates.length ? 'complete' : ''}><Check aria-hidden="true" size={15} />Admission gate</li>
            <li className={staff.length ? 'complete' : ''}><Check aria-hidden="true" size={15} />Check-in staff</li>
          </ul>
          {event?.status === 'PUBLISHED' && <a className="outline-action" href={`/events/${event.id}`}><Eye aria-hidden="true" size={17} />Public preview</a>}
        </aside>
      </div>
    </section>
  )
}

function EventDetailsForm({ item, onSaved, onError }: { item: EventItem | null; onSaved: (item: EventItem) => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false)

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const data = new FormData(formEvent.currentTarget)
    const start = new Date(String(data.get('startTime')))
    const end = new Date(String(data.get('endTime')))
    if (end <= start) return onError('Event end time must be after the start time.')
    setBusy(true)
    onError('')
    const request = {
      name: String(data.get('name')).trim(),
      description: String(data.get('description')).trim(),
      location: String(data.get('location')).trim(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    }
    try {
      onSaved(item ? await updateEvent(item.id, request) : await createEvent(request))
    } catch {
      onError(`Could not ${item ? 'save changes to' : 'create'} this event.`)
    } finally {
      setBusy(false)
    }
  }

  async function upload(file?: File) {
    if (!item || !file) return
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) return onError('Banner must be a JPG or PNG no larger than 5MB.')
    setBusy(true)
    try {
      onSaved(await uploadEventBanner(item.id, file))
    } catch {
      onError('Could not upload the event banner.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="workspace-form surface" onSubmit={submit}>
      <div><p className="eyebrow">Details</p><h2>{item ? 'Event information' : 'Create event'}</h2><p>These details set expectations everywhere the event appears.</p></div>
      <label className="field">Event name<input defaultValue={item?.name} name="name" required /></label>
      <label className="field">Description<textarea defaultValue={item?.description ?? ''} name="description" required /></label>
      <label className="field">Location<input defaultValue={item?.location} name="location" required /></label>
      <div className="field-row">
        <label className="field">Starts<input defaultValue={item ? localDateTime(item.startTime) : ''} name="startTime" type="datetime-local" required /></label>
        <label className="field">Ends<input defaultValue={item ? localDateTime(item.endTime) : ''} name="endTime" type="datetime-local" required /></label>
      </div>
      {item && <label className="banner-upload"><Image aria-hidden="true" size={20} /><span><strong>Event banner</strong><small>JPG or PNG, up to 5MB</small></span><input accept="image/jpeg,image/png" type="file" onChange={(change) => void upload(change.target.files?.[0])} /></label>}
      <div className="form-actions"><button className="primary-action" disabled={busy} type="submit">{busy ? 'Saving…' : item ? 'Save changes' : 'Create event'}</button></div>
    </form>
  )
}

function WorkspaceOverview({ item, tickets, gates, staff }: { item: EventItem; tickets: TicketTypeItem[]; gates: GateItem[]; staff: EventStaffItem[] }) {
  return (
    <section className="workspace-overview">
      <article className="surface workspace-summary"><p className="eyebrow">At a glance</p><h2>{item.name}</h2><p>{item.description}</p></article>
      <div className="workspace-counts">
        <a className="surface interactive-surface" href={`/organizer/events/${item.id}/tickets`}><Ticket aria-hidden="true" /><strong>{tickets.length}</strong><span>Ticket types</span></a>
        <a className="surface interactive-surface" href={`/organizer/events/${item.id}/gates`}><DoorOpen aria-hidden="true" /><strong>{gates.length}</strong><span>Gates</span></a>
        <a className="surface interactive-surface" href={`/organizer/events/${item.id}/staff`}><Users aria-hidden="true" /><strong>{staff.length}</strong><span>Staff</span></a>
      </div>
    </section>
  )
}

function TicketSection({ eventId, items, onCreated, onError }: { eventId: number; items: TicketTypeItem[]; onCreated: () => void; onError: (message: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const start = new Date(String(data.get('salesStartAt')))
    const end = new Date(String(data.get('salesEndAt')))
    if (end <= start) return onError('Ticket sales end must be after sales start.')
    try {
      await createTicketType(eventId, { name: String(data.get('name')).trim(), price: Number(data.get('price')), quantityTotal: Number(data.get('quantityTotal')), salesStartAt: start.toISOString(), salesEndAt: end.toISOString() })
      event.currentTarget.reset()
      onCreated()
    } catch {
      onError('Could not create this ticket type.')
    }
  }
  return <ManagementSection icon={<Ticket />} title="Ticket types" description="Define inventory, price, and the sales window." items={items.map((item) => <div className="management-item" key={item.id}><span><strong>{item.name}</strong><small>{item.quantityRemaining} of {item.quantityTotal} remaining</small></span><strong>{money.format(item.price)}</strong></div>)}>
    <form className="compact-create-form" onSubmit={submit}><label className="field">Name<input name="name" required /></label><div className="field-row"><label className="field">Price<input min="0" name="price" type="number" required /></label><label className="field">Quantity<input min="1" name="quantityTotal" type="number" required /></label></div><div className="field-row"><label className="field">Sales start<input name="salesStartAt" type="datetime-local" required /></label><label className="field">Sales end<input name="salesEndAt" type="datetime-local" required /></label></div><button className="primary-action" type="submit"><Plus aria-hidden="true" size={17} />Add ticket type</button></form>
  </ManagementSection>
}

function GateSection({ eventId, items, onCreated, onError }: { eventId: number; items: GateItem[]; onCreated: () => void; onError: (message: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      await createGate(eventId, String(data.get('name')).trim())
      event.currentTarget.reset()
      onCreated()
    } catch { onError('Could not create this gate.') }
  }
  return <ManagementSection icon={<DoorOpen />} title="Admission gates" description="Create clear gate names staff can choose while scanning." items={items.map((item) => <div className="management-item" key={item.id}><strong>{item.name}</strong><span className="status">Gate</span></div>)}>
    <form className="inline-create-form" onSubmit={submit}><label className="field">Gate name<input name="name" required /></label><button className="primary-action" type="submit"><Plus aria-hidden="true" size={17} />Add gate</button></form>
  </ManagementSection>
}

function StaffSection({ eventId, items, onCreated, onError }: { eventId: number; items: EventStaffItem[]; onCreated: () => void; onError: (message: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      await createEventStaff(eventId, { fullName: String(data.get('fullName')).trim(), email: String(data.get('email')).trim(), password: String(data.get('password')) })
      event.currentTarget.reset()
      onCreated()
    } catch { onError('Could not add this staff account.') }
  }
  return <ManagementSection icon={<Users />} title="Check-in staff" description="Create event-scoped accounts for the scanning team." items={items.map((item) => <div className="management-item" key={item.id}><span><strong>{item.fullName ?? item.email}</strong><small>{item.email}</small></span><span className="status">{item.active === false ? 'Inactive' : 'Active'}</span></div>)}>
    <form className="compact-create-form" onSubmit={submit}><label className="field">Full name<input autoComplete="name" name="fullName" required /></label><label className="field">Email<input autoComplete="email" name="email" type="email" required /></label><label className="field">Temporary password<input autoComplete="new-password" minLength={8} name="password" type="password" required /></label><button className="primary-action" type="submit"><Plus aria-hidden="true" size={17} />Add staff member</button></form>
  </ManagementSection>
}

function ManagementSection({ icon, title, description, items, children }: { icon: ReactNode; title: string; description: string; items: ReactNode[]; children: ReactNode }) {
  return <section className="management-section surface"><header><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></header><div className="management-items">{items.length ? items : <p className="management-empty">Nothing has been added yet.</p>}</div>{children}</section>
}

function PublishingSection({ item, tickets, gates }: { item: EventItem; tickets: TicketTypeItem[]; gates: GateItem[] }) {
  const ready = Boolean(item.name && item.location && tickets.length && gates.length)
  return <section className="publishing-panel surface"><p className="eyebrow">Publishing</p><h2>{item.status === 'PUBLISHED' ? 'Event is published' : 'Review event readiness'}</h2><p>{ready ? 'Required event, ticket, and gate details are complete.' : 'Complete the missing setup before publishing.'}</p><ul className="readiness-list"><li className="complete"><Check aria-hidden="true" size={15} />Event details complete</li><li className={tickets.length ? 'complete' : ''}><Check aria-hidden="true" size={15} />Ticket type added</li><li className={gates.length ? 'complete' : ''}><Check aria-hidden="true" size={15} />Gate added</li></ul>{item.status === 'PUBLISHED' ? <a className="primary-action" href={`/events/${item.id}`}><Eye aria-hidden="true" size={17} />View published event</a> : <p className="inline-note">Publishing is unavailable because the current API does not expose a publication action.</p>}</section>
}
