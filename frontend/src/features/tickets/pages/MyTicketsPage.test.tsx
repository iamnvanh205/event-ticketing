import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyTicketsPage } from './MyTicketsPage'
import * as ticketApi from '../api/ticketApi'
import * as eventApi from '../../events/api/eventApi'
import type { TicketItem } from '../types'

vi.mock('../api/ticketApi')
vi.mock('../../events/api/eventApi')
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ title }: { title: string }) => <svg data-testid="qr-code" aria-label={title} />,
}))

const makeTicket = (id: number, status: TicketItem['status']): TicketItem => ({
  id,
  ticketTypeId: 10,
  status,
  quantity: 1,
  qrCode: status === 'CONFIRMED' ? `qr-${id}` : null,
  expiresAt: status === 'RESERVED' ? '2026-08-01T09:15:00Z' : null,
  reservedAt: '2026-08-01T09:00:00Z',
  confirmedAt: status === 'CONFIRMED' ? '2026-08-01T09:05:00Z' : null,
  checkedInAt: status === 'CHECKED_IN' ? '2026-08-01T10:00:00Z' : null,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(eventApi.getTicketType).mockResolvedValue({
    id: 10, eventId: 1, name: 'Standard', price: 100000,
    quantityTotal: 100, quantityRemaining: 50, salesStartAt: '', salesEndAt: '',
  })
  vi.mocked(eventApi.getEvent).mockResolvedValue({
    id: 1, name: 'Summer Festival', description: 'Great event', location: 'Hanoi',
    organizerId: 1, status: 'PUBLISHED', startTime: '2026-08-01T09:00:00Z',
    endTime: '2026-08-01T18:00:00Z', bannerUrl: null, createdAt: '2026-07-01T00:00:00Z',
  })
})

describe('MyTicketsPage', () => {
  it('renders the page title and empty state', async () => {
    vi.mocked(ticketApi.listMyTickets).mockResolvedValue([])
    render(<MyTicketsPage />)

    expect(screen.getByRole('heading', { name: /my tickets/i })).toBeInTheDocument()
    expect(await screen.findByText(/no upcoming tickets/i)).toBeInTheDocument()
  })

  it('renders active tickets with event context', async () => {
    vi.mocked(ticketApi.listMyTickets).mockResolvedValue([
      makeTicket(1, 'RESERVED'),
      makeTicket(2, 'CONFIRMED'),
    ])
    render(<MyTicketsPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Summer Festival' })).toHaveLength(2)
      expect(screen.getByText('Ticket #1')).toBeInTheDocument()
      expect(screen.getByText('Ticket #2')).toBeInTheDocument()
    })
  })

  it('uses clear status and actions for a held ticket', async () => {
    vi.mocked(ticketApi.listMyTickets).mockResolvedValue([makeTicket(1, 'RESERVED')])
    render(<MyTicketsPage />)

    expect(await screen.findByText('Held')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /complete reservation/i })).toHaveAttribute('href', '/checkout/1')
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows a ticket link and QR for a confirmed ticket', async () => {
    vi.mocked(ticketApi.listMyTickets).mockResolvedValue([makeTicket(2, 'CONFIRMED')])
    render(<MyTicketsPage />)

    expect(await screen.findByText('Ready for entry')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view ticket/i })).toHaveAttribute('href', '/tickets/2')
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('reloads tickets after cancelling', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.listMyTickets)
      .mockResolvedValueOnce([makeTicket(1, 'RESERVED')])
      .mockResolvedValueOnce([])
    vi.mocked(ticketApi.cancelTicket).mockResolvedValue(undefined)
    render(<MyTicketsPage />)

    await user.click(await screen.findByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(ticketApi.listMyTickets).toHaveBeenCalledTimes(2)
    })
  })

  it('shows an error when cancelling fails', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.listMyTickets).mockResolvedValue([makeTicket(1, 'RESERVED')])
    vi.mocked(ticketApi.cancelTicket).mockRejectedValue(new Error('Conflict'))
    render(<MyTicketsPage />)

    await user.click(await screen.findByRole('button', { name: /cancel/i }))
    expect(await screen.findByText(/ticket action failed/i)).toBeInTheDocument()
  })

  it('shows an error when the list request fails', async () => {
    vi.mocked(ticketApi.listMyTickets).mockRejectedValue(new Error('Network error'))
    render(<MyTicketsPage />)

    expect(await screen.findByText(/your ticket wallet is temporarily unavailable/i)).toBeInTheDocument()
  })

  it('separates active and past ticket statuses', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.listMyTickets).mockResolvedValue([
      makeTicket(1, 'RESERVED'),
      makeTicket(2, 'CONFIRMED'),
      makeTicket(3, 'CHECKED_IN'),
      makeTicket(4, 'EXPIRED'),
      makeTicket(5, 'CANCELLED'),
    ])
    render(<MyTicketsPage />)

    expect(await screen.findByText('Held')).toBeInTheDocument()
    expect(screen.getByText('Ready for entry')).toBeInTheDocument()
    expect(screen.queryByText('Checked in')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /past & inactive/i }))
    expect(screen.getByText('Checked in')).toBeInTheDocument()
    expect(screen.getByText('Expired')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })
})
