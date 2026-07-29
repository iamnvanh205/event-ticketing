import { useEffect, useState } from 'react'
import { CircleAlert, ShieldCheck, UserCheck, UserRound, Users } from 'lucide-react'
import { PageTitle } from '../../../components/layout/PageTitle'
import { PageState } from '../../../components/ui/feedback'
import { listAdminUsers } from '../api/adminApi'
import type { AuthUser } from '../../auth/types'

export function AdminDashboardPage() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listAdminUsers()
      .then((page) => {
        setUsers(page.content)
        setTotal(page.totalElements)
      })
      .catch(() => setError('User health data is temporarily unavailable.'))
      .finally(() => setLoading(false))
  }, [])

  const activeOnPage = users.filter((user) => user.active !== false).length
  const adminsOnPage = users.filter((user) => user.role === 'ADMIN').length

  return (
    <section className="page admin-dashboard">
      <PageTitle eyebrow="Platform administration" title="Admin overview" description="Review server-backed account health and move directly to the action that needs attention." />
      {error && <div className="admin-alert" role="alert"><CircleAlert aria-hidden="true" size={20} /><div><strong>User module unavailable</strong><span>{error}</span></div><a className="outline-action" href="/admin/users">Open users</a></div>}
      {loading ? <div className="organizer-metric-grid" aria-label="Loading administrative metrics">{Array.from({ length: 3 }, (_, index) => <span className="skeleton metric-skeleton" key={index} />)}</div> : (
        <section className="organizer-metric-grid admin-metrics" aria-label="Administrative metrics">
          <article className="stats-card"><span><Users aria-hidden="true" /></span><p>Total user accounts</p><strong>{total?.toLocaleString() ?? '—'}</strong></article>
          <article className="stats-card"><span><UserCheck aria-hidden="true" /></span><p>Active on this page</p><strong>{activeOnPage}</strong></article>
          <article className="stats-card"><span><ShieldCheck aria-hidden="true" /></span><p>Admins on this page</p><strong>{adminsOnPage}</strong></article>
        </section>
      )}
      <section className="admin-module-grid">
        <article className="surface admin-module">
          <div className="module-heading"><span><UserRound aria-hidden="true" /></span><div><p className="eyebrow">User health</p><h2>Account administration</h2></div></div>
          <p>Search users, review role and account state, then lock or restore access with explicit confirmation.</p>
          <a className="primary-action" href="/admin/users">Manage users</a>
        </article>
        <article className="surface admin-module unavailable">
          <div className="module-heading"><span><CircleAlert aria-hidden="true" /></span><div><p className="eyebrow">Event oversight</p><h2>Not available</h2></div></div>
          <p>The current API has no administrator event-oversight or system-health endpoint. No placeholder metrics are shown.</p>
        </article>
      </section>
      {!loading && !error && users.length === 0 && <PageState title="No user accounts returned" description="The administration API returned an empty first page." />}
    </section>
  )
}
