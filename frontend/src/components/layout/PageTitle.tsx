import type { ReactNode } from 'react'

interface PageTitleProps {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}

export function PageTitle({ eyebrow, title, description, action }: PageTitleProps) {
  return (
    <header className="page-title">
      <div className="page-title-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-title-action">{action}</div>}
    </header>
  )
}
