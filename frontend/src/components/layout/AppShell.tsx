import type { ReactNode } from 'react'
import {
  CalendarDays,
  ChartNoAxesCombined,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Search,
  Settings,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react'
import type { Role } from '../../features/auth/types'
import { usePath } from '../../routes/navigation'
import { ThemeToggle } from './ThemeToggle'

type AppRole = Role | 'GUEST'

interface AppShellProps {
  children: ReactNode
  role: AppRole
  userName: string
  onLogout: () => Promise<void>
}

interface NavItem {
  href: string
  label: string
  icon: typeof CalendarDays
}

const navByRole: Record<AppRole, NavItem[]> = {
  GUEST: [
    { href: '/events', label: 'Discover', icon: CalendarDays },
    { href: '/search', label: 'Search', icon: Search },
  ],
  CUSTOMER: [
    { href: '/events', label: 'Discover', icon: CalendarDays },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/tickets', label: 'Tickets', icon: Ticket },
  ],
  ORGANIZER: [
    { href: '/organizer', label: 'Overview', icon: LayoutDashboard },
    { href: '/organizer/events', label: 'Events', icon: CalendarDays },
    { href: '/organizer/live', label: 'Live operations', icon: ChartNoAxesCombined },
    { href: '/organizer/check-ins', label: 'Check-ins', icon: History },
  ],
  CHECKIN_STAFF: [
    { href: '/checkin', label: 'Scan', icon: ScanLine },
    { href: '/checkin/history', label: 'History', icon: History },
  ],
  ADMIN: [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
  ],
}

function isActive(path: string, href: string) {
  if (/^\/organizer\/events\/\d+\/live$/.test(path)) return href === '/organizer/live'
  const exactOnly = ['/events', '/organizer', '/admin', '/checkin']
  return path === href || (!exactOnly.includes(href) && path.startsWith(`${href}/`))
}

function Brand() {
  return (
    <a className="brand-link" href="/events" aria-label="Event Ticketing home">
      <span className="brand-mark" aria-hidden="true"><Ticket size={18} /></span>
      <span>Event Ticketing</span>
    </a>
  )
}

function SiteFooter({ role }: { role: AppRole }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand"><Brand /><p>Discovery, reservations, and entry in one calm experience.</p></div>
        <nav aria-label="Footer navigation">
          <div><strong>Explore</strong><a href="/events">Discover events</a><a href="/search">Search</a></div>
          <div><strong>Account</strong>{role === 'CUSTOMER' ? <><a href="/tickets">My Tickets</a><a href="/account/profile">Profile</a></> : <a href="/auth">Sign in</a>}</div>
        </nav>
      </div>
      <p className="footer-legal">© {new Date().getFullYear()} Event Ticketing</p>
    </footer>
  )
}

function NavLinks({ items, path }: { items: NavItem[]; path: string }) {
  return items.map(({ href, label, icon: Icon }) => (
    <a className={`nav-link ${isActive(path, href) ? 'active' : ''}`} href={href} key={href} aria-current={isActive(path, href) ? 'page' : undefined}>
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
    </a>
  ))
}

function Topbar({ role, userName, onLogout, path, operational = false }: AppShellProps & { path: string; operational?: boolean }) {
  const items = navByRole[role]

  return (
    <header className={`topbar ${operational ? 'mobile-bar' : ''}`}>
      <div className="topbar-inner">
        <Brand />
        <nav aria-label="Primary navigation"><NavLinks items={items} path={path} /></nav>
        <div className="topbar-actions">
          <ThemeToggle />
          {role === 'GUEST' ? (
            <a className="outline-action desktop-only" href="/auth">Sign in</a>
          ) : (
            <>
              <a className="nav-link account-link" href="/account/profile">
                <UserRound aria-hidden="true" size={18} />
                <span>{userName}</span>
              </a>
              <button className="icon-button desktop-only" type="button" onClick={() => void onLogout()} aria-label="Sign out">
                <LogOut aria-hidden="true" size={18} />
              </button>
            </>
          )}
          <details className="mobile-menu">
            <summary className="icon-button" aria-label="Open navigation"><Menu aria-hidden="true" size={20} /></summary>
            <nav aria-label="Mobile navigation">
              <NavLinks items={items} path={path} />
              {role === 'GUEST' ? (
                <a className="nav-link" href="/auth"><UserRound aria-hidden="true" size={18} />Sign in</a>
              ) : (
                <>
                  <a className="nav-link" href="/account/profile"><UserRound aria-hidden="true" size={18} />Profile</a>
                  <a className="nav-link" href="/account/settings"><Settings aria-hidden="true" size={18} />Settings</a>
                  <button className="nav-link" type="button" onClick={() => void onLogout()}><LogOut aria-hidden="true" size={18} />Sign out</button>
                </>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}

export function AppShell(props: AppShellProps) {
  const path = usePath()
  const operational = props.role === 'ORGANIZER' || props.role === 'ADMIN'
  const attendeeMobileNav = props.role === 'CUSTOMER'

  if (!operational) {
    return (
      <div className="app-frame">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Topbar {...props} path={path} />
        <main className="app-main" id="main-content">{props.children}</main>
        {(props.role === 'GUEST' || props.role === 'CUSTOMER') && <SiteFooter role={props.role} />}
        {attendeeMobileNav && (
          <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
            <NavLinks items={[
              { href: '/events', label: 'Discover', icon: CalendarDays },
              { href: '/search', label: 'Search', icon: Search },
              { href: '/tickets', label: 'Tickets', icon: Ticket },
              { href: '/account/profile', label: 'Account', icon: UserRound },
            ]} path={path} />
          </nav>
        )}
      </div>
    )
  }

  const items = navByRole[props.role]
  return (
    <div className="app-frame has-sidebar">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="Primary navigation"><NavLinks items={items} path={path} /></nav>
        <div className="sidebar-footer">
          <a className="nav-link" href="/account/profile"><UserRound aria-hidden="true" size={18} />Profile</a>
          <a className="nav-link" href="/account/settings"><Settings aria-hidden="true" size={18} />Settings</a>
          <ThemeToggle labelled />
          <button className="nav-link" type="button" onClick={() => void props.onLogout()}><LogOut aria-hidden="true" size={18} />Sign out</button>
          <div className="sidebar-user"><strong>{props.userName}</strong><span>{props.role.replace('_', ' ')}</span></div>
        </div>
      </aside>
      <div className="app-main">
        <Topbar {...props} path={path} operational />
        <main id="main-content">{props.children}</main>
      </div>
    </div>
  )
}
