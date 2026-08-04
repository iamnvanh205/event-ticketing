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
import { copy, useLanguageCopy } from '../../lib/language'
import { BrandMark } from './BrandMark'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'

type AppRole = Role | 'GUEST'
type NavLabelKey = keyof typeof copy.en.nav

interface AppShellProps {
  children: ReactNode
  role: AppRole
  userName: string
  onLogout: () => Promise<void>
}

interface NavItem {
  href: string
  labelKey: NavLabelKey
  icon: typeof CalendarDays
}

interface LocalizedNavItem {
  href: string
  label: string
  icon: typeof CalendarDays
}

const navByRole: Record<AppRole, NavItem[]> = {
  GUEST: [
    { href: '/events', labelKey: 'discover', icon: CalendarDays },
    { href: '/search', labelKey: 'search', icon: Search },
  ],
  CUSTOMER: [
    { href: '/events', labelKey: 'discover', icon: CalendarDays },
    { href: '/search', labelKey: 'search', icon: Search },
    { href: '/tickets', labelKey: 'tickets', icon: Ticket },
  ],
  ORGANIZER: [
    { href: '/organizer', labelKey: 'overview', icon: LayoutDashboard },
    { href: '/organizer/events', labelKey: 'events', icon: CalendarDays },
    { href: '/organizer/live', labelKey: 'liveOperations', icon: ChartNoAxesCombined },
    { href: '/organizer/check-ins', labelKey: 'checkIns', icon: History },
  ],
  CHECKIN_STAFF: [
    { href: '/checkin', labelKey: 'scan', icon: ScanLine },
    { href: '/checkin/history', labelKey: 'history', icon: History },
  ],
  ADMIN: [
    { href: '/admin', labelKey: 'overview', icon: LayoutDashboard },
    { href: '/admin/users', labelKey: 'users', icon: Users },
  ],
}

function isActive(path: string, href: string) {
  if (/^\/organizer\/events\/\d+\/live$/.test(path)) return href === '/organizer/live'
  const exactOnly = ['/events', '/organizer', '/admin', '/checkin']
  return path === href || (!exactOnly.includes(href) && path.startsWith(`${href}/`))
}

function homeForRole(role: AppRole) {
  if (role === 'ORGANIZER') return '/organizer'
  if (role === 'CHECKIN_STAFF') return '/checkin'
  if (role === 'ADMIN') return '/admin'
  return '/events'
}

function localizedNav(role: AppRole, ui: ReturnType<typeof useLanguageCopy>) {
  return navByRole[role].map((item) => ({ ...item, label: ui.nav[item.labelKey] }))
}

function Brand({ href = '/events' }: { href?: string }) {
  return (
    <a className="brand-link" href={href} aria-label="Event Ticketing home">
      <BrandMark />
      <span>Event Ticketing</span>
    </a>
  )
}

function SiteFooter({ role }: { role: AppRole }) {
  const ui = useLanguageCopy()

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Brand />
          <p>{ui.footerDescription}</p>
        </div>
        <nav aria-label="Footer navigation">
          <div>
            <strong>{ui.nav.explore}</strong>
            <a href="/events">{ui.nav.discover}</a>
            <a href="/search">{ui.nav.search}</a>
          </div>
          <div>
            <strong>{ui.nav.account}</strong>
            {role === 'CUSTOMER' ? (
              <>
                <a href="/tickets">{ui.nav.tickets}</a>
                <a href="/account/profile">{ui.nav.profile}</a>
              </>
            ) : (
              <a href="/auth">{ui.nav.signIn}</a>
            )}
          </div>
        </nav>
      </div>
      <p className="footer-legal">&copy; {new Date().getFullYear()} Event Ticketing</p>
    </footer>
  )
}

function NavLinks({ items, path }: { items: LocalizedNavItem[]; path: string }) {
  return items.map(({ href, label, icon: Icon }) => (
    <a className={`nav-link ${isActive(path, href) ? 'active' : ''}`} href={href} key={href} aria-current={isActive(path, href) ? 'page' : undefined}>
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
    </a>
  ))
}

function Topbar({ role, userName, onLogout, path, operational = false }: AppShellProps & { path: string; operational?: boolean }) {
  const ui = useLanguageCopy()
  const items = localizedNav(role, ui)

  return (
    <header className={`topbar ${operational ? 'mobile-bar' : ''}`}>
      <div className="topbar-inner">
        <Brand href={homeForRole(role)} />
        <nav aria-label="Primary navigation"><NavLinks items={items} path={path} /></nav>
        <div className="topbar-actions">
          <ThemeToggle />
          <LanguageToggle />
          {role === 'GUEST' ? (
            <a className="outline-action desktop-only" href="/auth">{ui.nav.signIn}</a>
          ) : (
            <>
              <a className="nav-link account-link" href="/account/profile">
                <UserRound aria-hidden="true" size={18} />
                <span>{userName}</span>
              </a>
              <button className="icon-button desktop-only" type="button" onClick={() => void onLogout()} aria-label={ui.nav.signOut}>
                <LogOut aria-hidden="true" size={18} />
              </button>
            </>
          )}
          <details className="mobile-menu" key={path}>
            <summary className="icon-button" aria-label="Open navigation"><Menu aria-hidden="true" size={20} /></summary>
            <nav aria-label="Mobile navigation">
              <NavLinks items={items} path={path} />
              {role === 'GUEST' ? (
                <a className="nav-link" href="/auth"><UserRound aria-hidden="true" size={18} />{ui.nav.signIn}</a>
              ) : (
                <>
                  <a className="nav-link" href="/account/profile"><UserRound aria-hidden="true" size={18} />{ui.nav.profile}</a>
                  <a className="nav-link" href="/account/settings"><Settings aria-hidden="true" size={18} />{ui.nav.settings}</a>
                  <button className="nav-link" type="button" onClick={() => void onLogout()}><LogOut aria-hidden="true" size={18} />{ui.nav.signOut}</button>
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
  const ui = useLanguageCopy()
  const operational = props.role === 'ORGANIZER' || props.role === 'ADMIN'
  const attendeeMobileNav = props.role === 'CUSTOMER'
  const items = localizedNav(props.role, ui)

  if (!operational) {
    return (
      <div className="app-frame">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Topbar {...props} path={path} />
        <main className="app-main" id="main-content" tabIndex={-1}>{props.children}</main>
        {(props.role === 'GUEST' || props.role === 'CUSTOMER') && <SiteFooter role={props.role} />}
        {attendeeMobileNav && (
          <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
            <NavLinks
              items={[
                { href: '/events', label: ui.nav.discover, icon: CalendarDays },
                { href: '/search', label: ui.nav.search, icon: Search },
                { href: '/tickets', label: ui.nav.tickets, icon: Ticket },
                { href: '/account/profile', label: ui.nav.account, icon: UserRound },
              ]}
              path={path}
            />
          </nav>
        )}
      </div>
    )
  }

  return (
    <div className="app-frame has-sidebar">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <Brand href={homeForRole(props.role)} />
        <nav className="sidebar-nav" aria-label="Primary navigation"><NavLinks items={items} path={path} /></nav>
        <div className="sidebar-footer">
          <a className="nav-link" href="/account/profile"><UserRound aria-hidden="true" size={18} />{ui.nav.profile}</a>
          <a className="nav-link" href="/account/settings"><Settings aria-hidden="true" size={18} />{ui.nav.settings}</a>
          <ThemeToggle labelled />
          <LanguageToggle labelled />
          <button className="nav-link" type="button" onClick={() => void props.onLogout()}><LogOut aria-hidden="true" size={18} />{ui.nav.signOut}</button>
          <div className="sidebar-user"><strong>{props.userName}</strong><span>{ui.roles[props.role]}</span></div>
        </div>
      </aside>
      <div className="app-main">
        <Topbar {...props} path={path} operational />
        <main id="main-content" tabIndex={-1}>{props.children}</main>
      </div>
    </div>
  )
}
