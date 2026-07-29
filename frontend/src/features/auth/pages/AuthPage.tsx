import { ArrowLeft, CalendarCheck, ScanLine, Ticket } from 'lucide-react'
import { ThemeToggle } from '../../../components/layout/ThemeToggle'
import { LoginForm } from '../components/LoginForm'

export function AuthPage() {
  return (
    <main className="auth-page" id="main-content">
      <a className="skip-link" href="#auth-form">Skip to sign in</a>
      <header className="auth-header">
        <a className="brand-link" href="/" aria-label="Event Ticketing home">
          <span className="brand-mark" aria-hidden="true"><Ticket size={18} /></span>
          <span>Event Ticketing</span>
        </a>
        <ThemeToggle />
      </header>
      <section className="auth-story" aria-labelledby="auth-story-title">
        <div>
          <p className="eyebrow">One account, every moment</p>
          <h1 id="auth-story-title">From first look to front row.</h1>
          <p>Reserve tickets, run events, and keep every entrance moving from one carefully designed workspace.</p>
        </div>
        <div className="auth-proof">
          <span><CalendarCheck aria-hidden="true" size={18} />Attendee-ready tickets</span>
          <span><ScanLine aria-hidden="true" size={18} />Fast, reliable check-in</span>
        </div>
      </section>
      <section className="auth-form-wrap" id="auth-form">
        <a className="back-link" href="/events"><ArrowLeft aria-hidden="true" size={17} />Back to events</a>
        <LoginForm />
      </section>
    </main>
  )
}
