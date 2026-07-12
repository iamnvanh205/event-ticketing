import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventDetailPage } from './EventDetailPage'
import * as eventApi from '../api/eventApi'
import * as ticketApi from '../../tickets/api/ticketApi'
import * as navigation from '../../../routes/navigation'

vi.mock('../api/eventApi')
vi.mock('../../tickets/api/ticketApi')
vi.mock('../../../routes/navigation', () => ({ navigate: vi.fn() }))
// QRCodeSVG renders a real SVG — keep it in tests
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ title }: { title: string }) => <svg data-testid="qr-code" aria-label={title} />,
}))

const mockEvent = {
  id: 1,
  name: 'Summer Festival',
  description: 'Great event',
  location: 'Hanoi',
  organizerId: 1,
  status: 'PUBLISHED',
  startTime: '2026-08-01T09:00:00Z',
  endTime: '2026-08-01T18:00:00Z',
  bannerUrl: null,
  createdAt: '2026-07-01T00:00:00Z',
}

const mockTicketTypes = [
  { id: 10, eventId: 1, name: 'Standard', price: 100000, quantityTotal: 100, quantityRemaining: 50, salesStartAt: '', salesEndAt: '' },
  { id: 11, eventId: 1, name: 'VIP', price: 500000, quantityTotal: 20, quantityRemaining: 0, salesStartAt: '', salesEndAt: '' },
]

const makeReserved = (status: import('../../tickets/types').TicketStatus = 'RESERVED') => ({
  id: 99, ticketTypeId: 10, status, quantity: 1,
  qrCode: status === 'CONFIRMED' ? 'qr-code-value' : null,
  expiresAt: '2026-08-01T09:15:00Z', reservedAt: '2026-08-01T09:00:00Z',
  confirmedAt: status === 'CONFIRMED' ? '2026-08-01T09:05:00Z' : null,
  checkedInAt: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(eventApi.getEvent).mockResolvedValue(mockEvent)
  vi.mocked(eventApi.listTicketTypes).mockResolvedValue(mockTicketTypes)
})

describe('EventDetailPage', () => {
  it('shows loading message before data arrives', () => {
    vi.mocked(eventApi.getEvent).mockReturnValue(new Promise(() => {}))
    vi.mocked(eventApi.listTicketTypes).mockReturnValue(new Promise(() => {}))
    render(<EventDetailPage eventId={1} signedIn />)
    expect(screen.getByText(/loading event/i)).toBeInTheDocument()
  })

  it('renders event name and location after load', async () => {
    render(<EventDetailPage eventId={1} signedIn />)
    await waitFor(() => {
      expect(screen.getByText('Summer Festival')).toBeInTheDocument()
      expect(screen.getByText('Hanoi')).toBeInTheDocument()
    })
  })

  it('renders ticket type names and prices', async () => {
    render(<EventDetailPage eventId={1} signedIn />)
    await waitFor(() => {
      expect(screen.getByText('Standard')).toBeInTheDocument()
      expect(screen.getByText('VIP')).toBeInTheDocument()
    })
  })

  it('disables Reserve button when quantityRemaining is 0', async () => {
    render(<EventDetailPage eventId={1} signedIn />)
    await waitFor(() => screen.getByText('VIP'))

    const buttons = screen.getAllByRole('button', { name: /reserve/i })
    // VIP has 0 remaining — it should be the disabled one
    const vipButton = buttons.find((btn) => btn.closest('.ticket-type')?.textContent?.includes('VIP'))
    expect(vipButton).toBeDisabled()
  })

  it('redirects to /account when not signed in and Reserve is clicked', async () => {
    const user = userEvent.setup()
    render(<EventDetailPage eventId={1} signedIn={false} />)
    await waitFor(() => screen.getByText('Standard'))

    const [reserveStandard] = screen.getAllByRole('button', { name: /reserve/i })
    await user.click(reserveStandard)

    expect(vi.mocked(navigation.navigate)).toHaveBeenCalledWith('/account')
  })

  it('shows reserved box after successful reservation', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.reserveTicket).mockResolvedValue(makeReserved())
    render(<EventDetailPage eventId={1} signedIn />)
    await waitFor(() => screen.getByText('Standard'))

    const [reserveBtn] = screen.getAllByRole('button', { name: /reserve/i })
    await user.click(reserveBtn)

    await waitFor(() => {
      expect(screen.getByText(/reservation #99/i)).toBeInTheDocument()
      expect(screen.getByText('RESERVED')).toBeInTheDocument()
    })
  })

  it('shows Confirm button when ticket is RESERVED', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.reserveTicket).mockResolvedValue(makeReserved('RESERVED'))
    render(<EventDetailPage eventId={1} signedIn />)
    await waitFor(() => screen.getByText('Standard'))

    await user.click(screen.getAllByRole('button', { name: /reserve/i })[0])
    await waitFor(() => screen.getByText('RESERVED'))

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
  })

  it('shows QR code after confirming reservation', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.reserveTicket).mockResolvedValue(makeReserved('RESERVED'))
    vi.mocked(ticketApi.confirmTicket).mockResolvedValue(makeReserved('CONFIRMED'))
    render(<EventDetailPage eventId={1} signedIn />)
    await waitFor(() => screen.getByText('Standard'))

    await user.click(screen.getAllByRole('button', { name: /reserve/i })[0])
    await waitFor(() => screen.getByRole('button', { name: /confirm/i }))
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    })
  })

  it('shows error message when reservation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.reserveTicket).mockRejectedValue(new Error('Sold out'))
    render(<EventDetailPage eventId={1} signedIn />)
    await waitFor(() => screen.getByText('Standard'))

    await user.click(screen.getAllByRole('button', { name: /reserve/i })[0])

    await waitFor(() => {
      expect(screen.getByText(/could not reserve/i)).toBeInTheDocument()
    })
  })

  it('shows error message when event fails to load', async () => {
    vi.mocked(eventApi.getEvent).mockRejectedValue(new Error('Not found'))
    render(<EventDetailPage eventId={999} signedIn />)

    await waitFor(() => {
      expect(screen.getByText(/could not load event/i)).toBeInTheDocument()
    })
  })
})
