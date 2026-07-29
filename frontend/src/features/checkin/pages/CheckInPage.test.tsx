import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckInPage } from './CheckInPage'
import * as eventApi from '../../events/api/eventApi'
import * as checkinApi from '../api/checkinApi'

vi.mock('../../events/api/eventApi')
vi.mock('../api/checkinApi')
vi.mock('../components/QrScanner', () => ({
  QrScanner: ({ onScan }: { onScan: (code: string) => void }) => <button data-testid="mock-scanner" onClick={() => onScan('scanned-qr-code')}>Simulate scan</button>,
}))

const mockEvents = [
  { id: 1, name: 'Event Alpha', description: null, location: 'Hanoi', organizerId: 1, status: 'PUBLISHED', startTime: '2026-08-01T09:00:00Z', endTime: '2026-08-01T18:00:00Z', bannerUrl: null, createdAt: '' },
  { id: 2, name: 'Event Beta', description: null, location: 'HCM', organizerId: 1, status: 'PUBLISHED', startTime: '2026-09-01T09:00:00Z', endTime: '2026-09-01T18:00:00Z', bannerUrl: null, createdAt: '' },
]

const mockGates = [
  { id: 101, eventId: 1, name: 'Gate A' },
  { id: 102, eventId: 1, name: 'Gate B' },
]

const mockResult = {
  ticketId: 99,
  status: 'CHECKED_IN',
  checkedInAt: '2026-08-01T10:30:00Z',
  gateId: 101,
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(eventApi.listEvents).mockResolvedValue(mockEvents)
  vi.mocked(eventApi.getEvent).mockResolvedValue(mockEvents[0])
  vi.mocked(eventApi.listGates).mockResolvedValue(mockGates)
})

describe('CheckInPage', () => {
  it('loads event and gate context', async () => {
    render(<CheckInPage />)

    expect(await screen.findByRole('heading', { name: 'Event Alpha' })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Gate A')).toBeInTheDocument()
  })

  it('uses only the assigned event when assignment is available', async () => {
    render(<CheckInPage assignedEventId={1} />)

    expect(await screen.findByRole('heading', { name: 'Event Alpha' })).toBeInTheDocument()
    expect(eventApi.getEvent).toHaveBeenCalledWith(1)
    expect(eventApi.listEvents).not.toHaveBeenCalled()
    expect(screen.queryByRole('combobox', { name: 'Event' })).not.toBeInTheDocument()
  })

  it('validates a manually entered code and clears it on success', async () => {
    const user = userEvent.setup()
    vi.mocked(checkinApi.checkIn).mockResolvedValue(mockResult)
    render(<CheckInPage />)
    await screen.findByDisplayValue('Gate A')

    const input = screen.getByLabelText(/ticket or qr code/i)
    await user.type(input, 'some-qr-code')
    await user.click(screen.getByRole('button', { name: /validate ticket/i }))

    expect(await screen.findByRole('heading', { name: /ticket accepted/i })).toBeInTheDocument()
    expect(screen.getByText('#99')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(screen.getByText(/1 admitted this session/i)).toBeInTheDocument()
  })

  it('preserves the code and explains a duplicate check-in', async () => {
    const user = userEvent.setup()
    vi.mocked(checkinApi.checkIn).mockRejectedValue({
      response: { status: 409, data: { errorCode: 'TICKET_ALREADY_CHECKED_IN' } },
    })
    render(<CheckInPage />)
    await screen.findByDisplayValue('Gate A')

    const input = screen.getByLabelText(/ticket or qr code/i)
    await user.type(input, 'duplicate-qr')
    await user.click(screen.getByRole('button', { name: /validate ticket/i }))

    expect(await screen.findByRole('heading', { name: /ticket not accepted/i })).toBeInTheDocument()
    expect(screen.getByText(/already been checked in/i)).toBeInTheDocument()
    expect(input).toHaveValue('duplicate-qr')
  })

  it('disables manual validation until a code is entered', async () => {
    render(<CheckInPage />)
    await screen.findByDisplayValue('Gate A')

    expect(screen.getByRole('button', { name: /validate ticket/i })).toBeDisabled()
    expect(checkinApi.checkIn).not.toHaveBeenCalled()
  })

  it('uses the selected gate and remembers it', async () => {
    const user = userEvent.setup()
    vi.mocked(checkinApi.checkIn).mockResolvedValue({ ...mockResult, gateId: 102 })
    render(<CheckInPage />)
    await screen.findByDisplayValue('Gate A')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Gate' }), '102')
    await user.type(screen.getByLabelText(/ticket or qr code/i), 'qr-xyz')
    await user.click(screen.getByRole('button', { name: /validate ticket/i }))

    await waitFor(() => expect(checkinApi.checkIn).toHaveBeenCalledWith('qr-xyz', 102))
    expect(sessionStorage.getItem('checkin-gate-1')).toBe('102')
  })

  it('validates a camera scan through the same flow', async () => {
    const user = userEvent.setup()
    vi.mocked(checkinApi.checkIn).mockResolvedValue(mockResult)
    render(<CheckInPage />)
    await screen.findByDisplayValue('Gate A')

    await user.click(screen.getByTestId('mock-scanner'))

    await waitFor(() => expect(checkinApi.checkIn).toHaveBeenCalledWith('scanned-qr-code', 101))
    expect(await screen.findByRole('heading', { name: /ticket accepted/i })).toBeInTheDocument()
  })

  it('loads gates again when the fallback event changes', async () => {
    const user = userEvent.setup()
    vi.mocked(eventApi.listGates)
      .mockResolvedValueOnce(mockGates)
      .mockResolvedValueOnce([{ id: 201, eventId: 2, name: 'Gate X' }])
    render(<CheckInPage />)
    await screen.findByDisplayValue('Gate A')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Event' }), '2')
    expect(await screen.findByDisplayValue('Gate X')).toBeInTheDocument()
  })

  it('shows a recoverable empty state when no gate is configured', async () => {
    vi.mocked(eventApi.listGates).mockResolvedValue([])
    render(<CheckInPage assignedEventId={1} />)

    expect(await screen.findByRole('heading', { name: /no admission gates/i })).toBeInTheDocument()
    expect(screen.getByText(/ask the organizer to add a gate/i)).toBeInTheDocument()
  })
})
