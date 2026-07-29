import { LogOut, Mail, Monitor, Palette, ShieldCheck, UserRound } from 'lucide-react'
import { useTheme } from 'next-themes'
import { PageTitle } from '../../../components/layout/PageTitle'
import type { AuthUser } from '../types'

interface AccountPageProps {
  mode?: 'profile' | 'settings'
  user: AuthUser
  onLogout: () => Promise<void>
}

export function AccountPage({ mode = 'profile', user, onLogout }: AccountPageProps) {
  return (
    <section className="page account-page">
      <PageTitle
        eyebrow="Your account"
        title={mode === 'profile' ? 'Profile' : 'Settings'}
        description={mode === 'profile' ? 'Review the identity and access details attached to this account.' : 'Control supported appearance and session preferences.'}
      />
      <div className="account-layout">
        <nav className="account-nav" aria-label="Account sections">
          <a aria-current={mode === 'profile' ? 'page' : undefined} className={mode === 'profile' ? 'active' : ''} href="/account/profile"><UserRound aria-hidden="true" size={18} />Profile</a>
          <a aria-current={mode === 'settings' ? 'page' : undefined} className={mode === 'settings' ? 'active' : ''} href="/account/settings"><Palette aria-hidden="true" size={18} />Settings</a>
        </nav>
        {mode === 'profile' ? <ProfilePanel user={user} /> : <SettingsPanel onLogout={onLogout} />}
      </div>
    </section>
  )
}

function ProfilePanel({ user }: { user: AuthUser }) {
  return (
    <section className="account-content">
      <article className="profile-card surface">
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">{user.fullName.slice(0, 1).toUpperCase()}</span>
          <div><h2>{user.fullName}</h2><p>{user.email}</p></div>
          <span className="status">{user.role.replaceAll('_', ' ').toLowerCase()}</span>
        </div>
        <div className="profile-fields">
          <label className="field">Full name<input readOnly value={user.fullName} /><span className="field-description">Profile editing is not supported by the current API.</span></label>
          <label className="field">Email address<input readOnly type="email" value={user.email} /><span className="field-description">Email changes require verification support from the backend.</span></label>
        </div>
      </article>
      <article className="account-meta surface">
        <div><span><ShieldCheck aria-hidden="true" /></span><div><h2>Account access</h2><p>Your role controls the workspace and actions available after sign-in.</p></div></div>
        <dl><div><dt>Role</dt><dd>{user.role.replaceAll('_', ' ').toLowerCase()}</dd></div><div><dt>Account ID</dt><dd>#{user.id}</dd></div>{user.assignedEventId && <div><dt>Assigned event</dt><dd>#{user.assignedEventId}</dd></div>}<div><dt>Status</dt><dd>{user.active === false ? 'Locked' : 'Active'}</dd></div></dl>
      </article>
    </section>
  )
}

function SettingsPanel({ onLogout }: { onLogout: () => Promise<void> }) {
  const { theme, setTheme } = useTheme()
  return (
    <section className="account-content">
      <article className="settings-group surface">
        <div className="settings-heading"><span><Monitor aria-hidden="true" /></span><div><h2>Appearance</h2><p>Choose how Event Ticketing looks on this device.</p></div></div>
        <label className="setting-row"><span><strong>Theme</strong><small>System follows your device preference.</small></span><select aria-label="Theme" value={theme ?? 'system'} onChange={(change) => setTheme(change.target.value)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      </article>
      <article className="settings-group surface">
        <div className="settings-heading"><span><Mail aria-hidden="true" /></span><div><h2>Notifications</h2><p>Notification preferences will appear when server support is available.</p></div></div>
        <p className="settings-unavailable">No notification preference API is currently exposed, so no switches are shown.</p>
      </article>
      <article className="settings-group surface">
        <div className="settings-heading"><span><ShieldCheck aria-hidden="true" /></span><div><h2>Security and sessions</h2><p>End the current authenticated session on this device.</p></div></div>
        <div className="setting-row"><span><strong>Current session</strong><small>Password changes and multi-session management require backend endpoints.</small></span><button className="outline-action" type="button" onClick={() => void onLogout()}><LogOut aria-hidden="true" size={17} />Sign out</button></div>
      </article>
    </section>
  )
}
