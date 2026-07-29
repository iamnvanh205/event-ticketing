import { useEffect, useState, type ReactNode } from 'react'
import { AppShell } from './components/layout/AppShell'
import { SystemStatePage } from './components/layout/SystemStatePage'
import { PageState } from './components/ui/feedback'
import { AccountPage } from './features/auth/pages/AccountPage'
import { AuthPage } from './features/auth/pages/AuthPage'
import { useAuth } from './features/auth/hooks/useAuth'
import type { Role } from './features/auth/types'
import { CheckInPage } from './features/checkin/pages/CheckInPage'
import { OrganizerDashboardPage } from './features/dashboard/pages/OrganizerDashboardPage'
import { EventDetailPage } from './features/events/pages/EventDetailPage'
import { EventsPage } from './features/events/pages/EventsPage'
import { MyTicketsPage } from './features/tickets/pages/MyTicketsPage'
import { navigate, usePath } from './routes/navigation'
import './App.css'

function homeForRole(role?: Role) {
  if (role === 'ORGANIZER') return '/dashboard'
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
    if (!ready || path !== '/') return
    navigate(homeForRole(user?.role))
  }, [path, ready, user?.role])

  if (!ready) {
    return <main><PageState kind="loading" title="Loading your session" description="Preparing a secure workspace…" /></main>
  }

  if (path === '/auth' || (!user && !isPublicPath(path))) {
    return <AuthPage />
  }

  let content: ReactNode
  if (path === '/events') {
    content = <EventsPage />
  } else if (/^\/events\/\d+$/.test(path)) {
    content = <EventDetailPage eventId={Number(path.split('/')[2])} signedIn={Boolean(user)} />
  } else if (path === '/tickets') {
    content = user?.role === 'CUSTOMER'
      ? <MyTicketsPage />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/checkin') {
    content = user?.role === 'CHECKIN_STAFF'
      ? <CheckInPage />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/dashboard') {
    content = user?.role === 'ORGANIZER'
      ? <OrganizerDashboardPage accessToken={accessToken} />
      : <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/account' || path === '/account/profile') {
    content = user
      ? <AccountPage onLogout={logout} user={user} />
      : <AuthPage />
  } else if (path === '/403') {
    content = <SystemStatePage kind="forbidden" homeHref={homeForRole(user?.role)} />
  } else if (path === '/') {
    content = <PageState kind="loading" title="Redirecting" description="Taking you to your workspace…" />
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
  return path === '/' || path === '/events' || /^\/events\/\d+$/.test(path) || path === '/auth'
}

export default App
