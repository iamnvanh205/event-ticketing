import { LogOut, Mail, Monitor, Palette, ShieldCheck, UserRound } from 'lucide-react'
import { useTheme } from 'next-themes'
import { PageTitle } from '../../../components/layout/PageTitle'
import { languageNames, type Language, useLanguage, useLanguageCopy } from '../../../lib/language'
import type { AuthUser } from '../types'

interface AccountPageProps {
  mode?: 'profile' | 'settings'
  user: AuthUser
  onLogout: () => Promise<void>
}

export function AccountPage({ mode = 'profile', user, onLogout }: AccountPageProps) {
  const ui = useLanguageCopy()

  return (
    <section className="page account-page">
      <PageTitle
        eyebrow={ui.account.eyebrow}
        title={mode === 'profile' ? ui.account.profileTitle : ui.account.settingsTitle}
        description={mode === 'profile' ? ui.account.profileDescription : ui.account.settingsDescription}
      />
      <div className="account-layout">
        <nav className="account-nav" aria-label="Account sections">
          <a aria-current={mode === 'profile' ? 'page' : undefined} className={mode === 'profile' ? 'active' : ''} href="/account/profile"><UserRound aria-hidden="true" size={18} />{ui.account.profileTitle}</a>
          <a aria-current={mode === 'settings' ? 'page' : undefined} className={mode === 'settings' ? 'active' : ''} href="/account/settings"><Palette aria-hidden="true" size={18} />{ui.account.settingsTitle}</a>
        </nav>
        {mode === 'profile' ? <ProfilePanel user={user} /> : <SettingsPanel onLogout={onLogout} />}
      </div>
    </section>
  )
}

function ProfilePanel({ user }: { user: AuthUser }) {
  const ui = useLanguageCopy()

  return (
    <section className="account-content">
      <article className="profile-card surface">
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">{user.fullName.slice(0, 1).toUpperCase()}</span>
          <div>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
          </div>
          <span className="status">{ui.roles[user.role]}</span>
        </div>
        <div className="profile-fields">
          <label className="field">
            {ui.account.fullName}
            <input readOnly value={user.fullName} />
            <span className="field-description">{ui.account.fullNameDescription}</span>
          </label>
          <label className="field">
            {ui.account.email}
            <input readOnly type="email" value={user.email} />
            <span className="field-description">{ui.account.emailDescription}</span>
          </label>
        </div>
      </article>
      <article className="account-meta surface">
        <div>
          <span><ShieldCheck aria-hidden="true" /></span>
          <div>
            <h2>{ui.account.accountAccess}</h2>
            <p>{ui.account.accessDescription}</p>
          </div>
        </div>
        <dl>
          <div><dt>{ui.account.role}</dt><dd>{ui.roles[user.role]}</dd></div>
          <div><dt>{ui.account.accountId}</dt><dd>#{user.id}</dd></div>
          {user.assignedEventId && <div><dt>{ui.account.assignedEvent}</dt><dd>#{user.assignedEventId}</dd></div>}
          <div><dt>{ui.account.status}</dt><dd>{user.active === false ? ui.account.locked : ui.account.active}</dd></div>
        </dl>
      </article>
    </section>
  )
}

function SettingsPanel({ onLogout }: { onLogout: () => Promise<void> }) {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const ui = useLanguageCopy()

  return (
    <section className="account-content">
      <article className="settings-group surface">
        <div className="settings-heading">
          <span><Monitor aria-hidden="true" /></span>
          <div>
            <h2>{ui.account.appearance}</h2>
            <p>{ui.account.appearanceDescription}</p>
          </div>
        </div>
        <label className="setting-row">
          <span>
            <strong>{ui.theme.label}</strong>
            <small>{ui.theme.description}</small>
          </span>
          <select aria-label={ui.theme.label} value={theme ?? 'system'} onChange={(event) => setTheme(event.target.value)}>
            <option value="system">System</option>
            <option value="light">{ui.theme.light}</option>
            <option value="dark">{ui.theme.dark}</option>
          </select>
        </label>
        <label className="setting-row">
          <span>
            <strong>{ui.language.label}</strong>
            <small>{ui.language.description}</small>
          </span>
          <select aria-label={ui.language.label} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
            <option value="en">{languageNames.en}</option>
            <option value="vi">{languageNames.vi}</option>
          </select>
        </label>
      </article>
      <article className="settings-group surface">
        <div className="settings-heading">
          <span><Mail aria-hidden="true" /></span>
          <div>
            <h2>{ui.account.notifications}</h2>
            <p>{ui.account.notificationsDescription}</p>
          </div>
        </div>
        <p className="settings-unavailable">{ui.account.notificationsUnavailable}</p>
      </article>
      <article className="settings-group surface">
        <div className="settings-heading">
          <span><ShieldCheck aria-hidden="true" /></span>
          <div>
            <h2>{ui.account.security}</h2>
            <p>{ui.account.securityDescription}</p>
          </div>
        </div>
        <div className="setting-row">
          <span>
            <strong>{ui.account.currentSession}</strong>
            <small>{ui.account.sessionDescription}</small>
          </span>
          <button className="outline-action" type="button" onClick={() => void onLogout()}>
            <LogOut aria-hidden="true" size={17} />
            {ui.nav.signOut}
          </button>
        </div>
      </article>
    </section>
  )
}
