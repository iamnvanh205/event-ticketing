import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventDetailPage } from './EventDetailPage'
import * as eventApi from '../api/eventApi'
import * as ticketApi from '../../tickets/api/ticketApi'
import * as navigation from '../../../routes/navigation'

vi.mock('../api/eventApi')
vi.mock('../../tickets/api/ticketApi')
vi.mock('../../../routes/navigation', () => ({ navigate: vi.fn() }))

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

const reservedTicket = {
  id: 99,
  ticketTypeId: 10,
  status: 'RESERVED' as const,
  quantity: 1,
  qrCode: null,
  expiresAt: '2026-08-01T09:15:00Z',
  reservedAt: '2026-08-01T09:00:00Z',
  confirmedAt: null,
  checkedInAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(eventApi.getEvent).mockResolvedValue(mockEvent)
  vi.mocked(eventApi.listTicketTypes).mockResolvedValue(mockTicketTypes)
})

describe('EventDetailPage', () => {
  it('shows loading state before data arrives', () => {
    vi.mocked(eventApi.getEvent).mockReturnValue(new Promise(() => {}))
    vi.mocked(eventApi.listTicketTypes).mockReturnValue(new Promise(() => {}))
    render(<EventDetailPage eventId={1} signedIn />)
    expect(screen.getByText(/loading event/i)).toBeInTheDocument()
  })

  it('renders event details and ticket choices', async () => {
    render(<EventDetailPage eventId={1} signedIn />)

    expect(await screen.findByRole('heading', { name: 'Summer Festival' })).toBeInTheDocument()
    expect(screen.getByText('Hanoi')).toBeInTheDocument()
    expect(screen.getByText('Standard')).toBeInTheDocument()
    expect(screen.getByText('VIP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sold out/i })).toBeDisabled()
  })

  it('redirects guests to authentication before reserving', async () => {
    const user = userEvent.setup()
    render(<EventDetailPage eventId={1} signedIn={false} />)
    await screen.findByText('Standard')

    await user.click(screen.getAllByRole('button', { name: /reserve/i })[0])
    expect(navigation.navigate).toHaveBeenCalledWith('/auth')
  })

  it('opens checkout after a successful reservation', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.reserveTicket).mockResolvedValue(reservedTicket)
    render(<EventDetailPage eventId={1} signedIn />)
    await screen.findByText('Standard')

    await user.click(screen.getAllByRole('button', { name: /reserve/i })[0])

    await waitFor(() => {
      expect(ticketApi.reserveTicket).toHaveBeenCalledWith(10, 1)
      expect(navigation.navigate).toHaveBeenCalledWith('/checkout/99')
    })
  })

  it('shows an error when reservation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.reserveTicket).mockRejectedValue(new Error('Sold out'))
    render(<EventDetailPage eventId={1} signedIn />)
    await screen.findByText('Standard')

    await user.click(screen.getAllByRole('button', { name: /reserve/i })[0])
    expect(await screen.findByText(/could not reserve/i)).toBeInTheDocument()
  })

  it('shows an error when the event fails to load', async () => {
    vi.mocked(eventApi.getEvent).mockRejectedValue(new Error('Not found'))
    render(<EventDetailPage eventId={999} signedIn />)

    expect(await screen.findByText(/could not load event/i)).toBeInTheDocument()
  })
})
