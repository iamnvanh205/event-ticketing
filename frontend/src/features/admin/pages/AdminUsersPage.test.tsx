import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminUsersPage } from './AdminUsersPage'
import * as adminApi from '../api/adminApi'

vi.mock('../api/adminApi')

describe('AdminUsersPage', () => {
  it('requires confirmation and applies the server account status', async () => {
    const user = userEvent.setup()
    const account = { id: 8, fullName: 'An Nguyen', email: 'an@example.com', role: 'CUSTOMER' as const, active: true }
    vi.mocked(adminApi.listAdminUsers).mockResolvedValue({ content: [account], page: 0, size: 20, totalElements: 1, totalPages: 1 })
    vi.mocked(adminApi.setAdminUserStatus).mockResolvedValue({ ...account, active: false })

    render(<AdminUsersPage currentUserId={1} />)

    await user.click(await screen.findByRole('button', { name: 'Lock' }))
    expect(screen.getByRole('dialog', { name: /lock this account/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /lock account/i }))

    expect(await screen.findByRole('button', { name: 'Restore' })).toBeInTheDocument()
    expect(adminApi.setAdminUserStatus).toHaveBeenCalledWith(8, false)
  })
})
