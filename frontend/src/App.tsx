import { useEffect, useState, type ReactNode } from 'react'
import { AppShell } from './components/layout/AppShell'
import { SystemStatePage } from './components/layout/SystemStatePage'
import { PageState } from './components/ui/feedback'
import { AccountPage } from './features/auth/pages/AccountPage'
import { AuthPage } from './features/auth/pages/AuthPage'
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage'
import { AdminUsersPage } from './features/admin/pages/AdminUsersPage'
import { useAuth } from './features/auth/hooks/useAuth'
import type { Role } from './features/auth/types'
import { CheckInPage } from './features/checkin/pages/CheckInPage'
import { CheckInHistoryPage } from './features/checkin/pages/CheckInHistoryPage'
import { OrganizerDashboardPage } from './features/dashboard/pages/OrganizerDashboardPage'
import { OrganizerEventsPage } from './features/dashboard/pages/OrganizerEventsPage'
import { EventWorkspacePage } from './features/dashboard/pages/EventWorkspacePage'
import { EventDetailPage } from './features/events/pages/EventDetailPage'
import { EventsPage } from './features/events/pages/EventsPage'
import { LandingPage } from './features/events/pages/LandingPage'
import { SearchPage } from './features/events/pages/SearchPage'
import { MyTicketsPage } from './features/tickets/pages/MyTicketsPage'
import { CheckoutPage } from './features/tickets/pages/CheckoutPage'
import { ConfirmationPage } from './features/tickets/pages/ConfirmationPage'
import { PaymentPage } from './features/tickets/pages/PaymentPage'
import { TicketDetailPage } from './features/tickets/pages/TicketDetailPage'
import { navigate, usePath } from './routes/navigation'
import './App.css'

function homeForRole(role?: Role) {
  if (role === 'ORGANIZER') return '/organizer'
  if (role === 'CHECKIN_STAFF') return '/checkin'
  if (role === 'ADMIN') return '/admin'
  return '/events'
}

function App() {
  const { accessToken, user, refresh, logout } = useAuth()
  const [ready, setReady] = useState(false)
  const path = usePath()

  useEffect(() => {
    void refresh().finally(() => setReady(true))
  }, [refresh])

  useEffect(() => {
    if (!ready || path !== '/' || !user) return
    navigate(homeForRole(user?.role))
  }, [path, ready, user])

  useEffect(() => {
    if (!ready || path !== '/auth' || !user) return
    const returnTo = sessionStorage.getItem('returnTo')
    sessionStorage.removeItem('returnTo')
    navigate(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : homeForRole(user.role))
  }, [path, ready, user])

  if (!ready) {
    return <main><PageState kind="loading" title="Loading your session" description="Preparing a secure workspace…" /></main>
  }

  if (path === '/auth') {
    return <AuthPage />
  }

  if (!user && !isPublicPath(path)) {
    return <AuthPage />
  }

  let content: ReactNode
  if (path === '/') {
    content = <LandingPage />
  } else if (path === '/events') {
    content = <EventsPage />
  } else if (path === '/search') {
    content = <SearchPage />
  } else if (/^\/events\/\d+$/.test(path)) {
    content = <EventDetailPage eventId={Number(path.split('/')[2])} signedIn={Boolean(user)} />
  } else if (path === '/tickets') {
    content = user?.role === 'CUSTOMER'
      ? <MyTicketsPage />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (/^\/tickets\/\d+$/.test(path)) {
    content = user?.role === 'CUSTOMER'
      ? <TicketDetailPage ticketId={Number(path.split('/')[2])} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (/^\/checkout\/\d+$/.test(path)) {
    content = user?.role === 'CUSTOMER'
      ? <CheckoutPage ticketId={Number(path.split('/')[2])} user={user} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (/^\/checkout\/\d+\/payment$/.test(path)) {
    content = user?.role === 'CUSTOMER'
      ? <PaymentPage />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (/^\/orders\/\d+\/confirmation$/.test(path)) {
    content = user?.role === 'CUSTOMER'
      ? <ConfirmationPage ticketId={Number(path.split('/')[2])} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/checkin') {
    content = user?.role === 'CHECKIN_STAFF'
      ? <CheckInPage assignedEventId={user.assignedEventId} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/checkin/history') {
    content = user?.role === 'CHECKIN_STAFF'
      ? <CheckInHistoryPage assignedEventId={user.assignedEventId} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/organizer/check-ins') {
    content = user?.role === 'ORGANIZER'
      ? <CheckInHistoryPage organizerId={user.id} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/dashboard' || path === '/organizer') {
    content = user?.role === 'ORGANIZER'
      ? <OrganizerDashboardPage accessToken={accessToken} organizerId={user.id} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/organizer/events') {
    content = user?.role === 'ORGANIZER'
      ? <OrganizerEventsPage organizerId={user.id} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/organizer/events/new') {
    content = user?.role === 'ORGANIZER'
      ? <EventWorkspacePage />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (/^\/organizer\/events\/\d+\/live$/.test(path)) {
    content = user?.role === 'ORGANIZER'
      ? <OrganizerDashboardPage accessToken={accessToken} organizerId={user.id} initialEventId={Number(path.split('/')[3])} liveOnly />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (/^\/organizer\/events\/\d+(\/[^/]+)?$/.test(path)) {
    content = user?.role === 'ORGANIZER'
      ? <EventWorkspacePage eventId={Number(path.split('/')[3])} section={path.split('/')[4]} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/organizer/live') {
    content = user?.role === 'ORGANIZER'
      ? <OrganizerDashboardPage accessToken={accessToken} organizerId={user.id} liveOnly />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/admin') {
    content = user?.role === 'ADMIN'
      ? <AdminDashboardPage />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/admin/users') {
    content = user?.role === 'ADMIN'
      ? <AdminUsersPage currentUserId={user.id} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/account' || path === '/account/profile') {
    content = user
      ? <AccountPage onLogout={logout} user={user} />
      : <AuthPage />
  } else if (path === '/account/settings') {
    content = user
      ? <AccountPage mode="settings" onLogout={logout} user={user} />
      : <AuthPage />
  } else if (path === '/403') {
    content = <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else {
    content = <SystemStatePage kind="not-found" homeHref={homeForRole(user?.role)} />
  }

  return (
    <AppShell role={user?.role ?? 'GUEST'} userName={user?.fullName ?? 'Guest'} onLogout={logout}>
      {content}
    </AppShell>
  )
}

function isPublicPath(path: string) {
  return path === '/' || path === '/events' || path === '/search' || /^\/events\/\d+$/.test(path) || path === '/auth'
}

export default App
