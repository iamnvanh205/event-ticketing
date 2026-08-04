import { ArrowLeft, CalendarCheck, ScanLine } from 'lucide-react'
import { BrandMark } from '../../../components/layout/BrandMark'
import { LanguageToggle } from '../../../components/layout/LanguageToggle'
import { ThemeToggle } from '../../../components/layout/ThemeToggle'
import { useLanguageCopy } from '../../../lib/language'
import { LoginForm } from '../components/LoginForm'

export function AuthPage() {
  const ui = useLanguageCopy()
  return (
    <main className="auth-page" id="main-content">
      <a className="skip-link" href="#auth-form">{ui.auth.skipToSignIn}</a>
      <header className="auth-header">
        <a className="brand-link" href="/" aria-label="Event Ticketing home">
          <BrandMark />
          <span>Event Ticketing</span>
        </a>
        <div className="auth-header-actions">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>
      <section className="auth-story" aria-labelledby="auth-story-title">
        <div>
          <p className="eyebrow">{ui.auth.eyebrow}</p>
          <h1 id="auth-story-title">{ui.auth.title}</h1>
          <p>{ui.auth.description}</p>
        </div>
        <div className="auth-proof">
          <span><CalendarCheck aria-hidden="true" size={18} />{ui.auth.proofTickets}</span>
          <span><ScanLine aria-hidden="true" size={18} />{ui.auth.proofCheckIn}</span>
        </div>
      </section>
      <section className="auth-form-wrap" id="auth-form">
        <a className="back-link" href="/events"><ArrowLeft aria-hidden="true" size={17} />{ui.auth.backToEvents}</a>
        <LoginForm />
      </section>
    </main>
  )
}
