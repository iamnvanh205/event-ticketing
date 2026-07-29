import { Ban, FileQuestion } from 'lucide-react'

interface SystemStatePageProps {
  kind: 'forbidden' | 'not-found'
  homeHref: string
}

export function SystemStatePage({ kind, homeHref }: SystemStatePageProps) {
  const forbidden = kind === 'forbidden'
  const Icon = forbidden ? Ban : FileQuestion
  return (
    <section className="page">
      <div className="page-state surface">
        <div className="page-state-content">
          <span className="page-state-icon" aria-hidden="true"><Icon size={22} /></span>
          <p className="eyebrow">{forbidden ? 'Access denied' : 'Page not found'}</p>
          <h1>{forbidden ? 'This area is not available to your account' : 'We could not find that page'}</h1>
          <p>{forbidden ? 'Return to your workspace or sign in with an account that has access.' : 'The address may be incorrect or the page may have moved.'}</p>
          <a className="primary-action" href={homeHref}>Return to your home</a>
        </div>
      </div>
    </section>
  )
}
