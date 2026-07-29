import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, LockKeyhole, Search, Shield, UnlockKeyhole } from 'lucide-react'
import { PageTitle } from '../../../components/layout/PageTitle'
import { PageState } from '../../../components/ui/feedback'
import type { AuthUser, Role } from '../../auth/types'
import { listAdminUsers, setAdminUserStatus } from '../api/adminApi'

export function AdminUsersPage({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<Role | 'ALL'>('ALL')
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<AuthUser | null>(null)

  useEffect(() => {
    listAdminUsers(page)
      .then((data) => {
        setUsers(data.content)
        setTotalPages(data.totalPages)
        setError('')
      })
      .catch(() => setError('Could not load user accounts.'))
      .finally(() => setLoading(false))
  }, [page])

  const visible = useMemo(() => users.filter((user) => {
    const matchesQuery = `${user.fullName} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesRole = role === 'ALL' || user.role === role
    const active = user.active !== false
    const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? active : !active)
    return matchesQuery && matchesRole && matchesStatus
  }), [query, role, status, users])

  async function confirmStatus() {
    if (!pending) return
    const active = pending.active === false
    try {
      const updated = await setAdminUserStatus(pending.id, active)
      setUsers((items) => items.map((item) => item.id === updated.id ? updated : item))
      setPending(null)
      setError('')
    } catch {
      setError(`Could not ${active ? 'restore' : 'lock'} this account.`)
    }
  }

  return (
    <section className="page admin-users-page">
      <PageTitle eyebrow="Platform accounts" title="User management" description="Review identity and role before changing an account’s access state." />
      <section className="admin-user-toolbar">
        <label className="search-field"><Search aria-hidden="true" size={18} /><span className="sr-only">Search users</span><input value={query} type="search" placeholder="Search name or email" onChange={(change) => setQuery(change.target.value)} /></label>
        <label className="field"><span className="sr-only">Filter by role</span><select value={role} onChange={(change) => setRole(change.target.value as Role | 'ALL')}><option value="ALL">All roles</option><option value="CUSTOMER">Customers</option><option value="ORGANIZER">Organizers</option><option value="CHECKIN_STAFF">Check-in staff</option><option value="ADMIN">Administrators</option></select></label>
        <label className="field"><span className="sr-only">Filter by account status</span><select value={status} onChange={(change) => setStatus(change.target.value as typeof status)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="LOCKED">Locked</option></select></label>
      </section>

      {error && <p className="inline-error" role="alert">{error}</p>}
      {loading && <div className="admin-user-list" aria-label="Loading users">{Array.from({ length: 6 }, (_, index) => <span className="skeleton history-row-skeleton" key={index} />)}</div>}
      {!loading && !error && visible.length === 0 && <PageState title="No users match" description="Adjust the search, role, or account-status filter." action={<button className="outline-action" type="button" onClick={() => { setQuery(''); setRole('ALL'); setStatus('ALL') }}>Clear filters</button>} />}
      {!loading && visible.length > 0 && (
        <div className="admin-user-table" role="table" aria-label="Platform users">
          <div className="admin-user-row admin-user-head" role="row"><span role="columnheader">User</span><span role="columnheader">Role</span><span role="columnheader">Status</span><span role="columnheader">Action</span></div>
          {visible.map((user) => {
            const active = user.active !== false
            return <div className="admin-user-row" role="row" key={user.id}>
              <span className="admin-identity" role="cell"><span className="avatar" aria-hidden="true">{user.fullName.slice(0, 1).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{user.email}</small></span></span>
              <span role="cell" data-label="Role"><span className="status"><Shield aria-hidden="true" size={13} />{user.role.replaceAll('_', ' ').toLowerCase()}</span></span>
              <span role="cell" data-label="Status"><span className={`status ${active ? 'success' : 'error'}`}>{active ? 'Active' : 'Locked'}</span></span>
              <span role="cell"><button className="outline-action" disabled={user.id === currentUserId} type="button" onClick={() => setPending(user)}>{active ? <LockKeyhole aria-hidden="true" size={16} /> : <UnlockKeyhole aria-hidden="true" size={16} />}{active ? 'Lock' : 'Restore'}</button></span>
            </div>
          })}
        </div>
      )}
      <nav className="pagination" aria-label="User pages">
        <button className="outline-action" disabled={page === 0} type="button" onClick={() => setPage((value) => value - 1)}><ChevronLeft aria-hidden="true" size={17} />Previous</button>
        <span>Page {page + 1} of {Math.max(totalPages, 1)}</span>
        <button className="outline-action" disabled={page + 1 >= totalPages} type="button" onClick={() => setPage((value) => value + 1)}>Next<ChevronRight aria-hidden="true" size={17} /></button>
      </nav>

      {pending && <div className="modal-backdrop">
        <section aria-describedby="status-dialog-description" aria-labelledby="status-dialog-title" aria-modal="true" className="confirm-dialog" role="dialog">
          <span className="dialog-icon">{pending.active === false ? <UnlockKeyhole aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</span>
          <h2 id="status-dialog-title">{pending.active === false ? 'Restore account access?' : 'Lock this account?'}</h2>
          <p id="status-dialog-description">{pending.active === false ? `${pending.fullName} will be able to sign in again.` : `${pending.fullName} will lose access until an administrator restores the account.`}</p>
          <div className="dialog-actions"><button autoFocus className="outline-action" type="button" onClick={() => setPending(null)}>Cancel</button><button className={pending.active === false ? 'primary-action' : 'button destructive-action'} type="button" onClick={() => void confirmStatus()}>{pending.active === false ? 'Restore access' : 'Lock account'}</button></div>
        </section>
      </div>}
    </section>
  )
}
