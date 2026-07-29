import type { ReactNode } from 'react'
import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'

export function StatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  const label = children ?? status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (value) => value.toUpperCase())
  return <span className={`status ${status.toLowerCase()}`}>{label}</span>
}

interface PageStateProps {
  title: string
  description: string
  action?: ReactNode
  kind?: 'empty' | 'error' | 'loading'
}

export function PageState({ title, description, action, kind = 'empty' }: PageStateProps) {
  const Icon = kind === 'loading' ? LoaderCircle : kind === 'error' ? AlertCircle : Inbox
  return (
    <section className="page-state" aria-live={kind === 'error' ? 'assertive' : 'polite'} aria-busy={kind === 'loading'}>
      <div className="page-state-content">
        <span className="page-state-icon" aria-hidden="true"><Icon className={kind === 'loading' ? 'animate-spin' : ''} size={22} /></span>
        <h1>{title}</h1>
        <p>{description}</p>
        {action}
      </div>
    </section>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />
}
