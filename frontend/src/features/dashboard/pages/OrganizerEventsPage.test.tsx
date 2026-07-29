import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrganizerEventsPage } from './OrganizerEventsPage'
import * as eventApi from '../../events/api/eventApi'

vi.mock('../../events/api/eventApi')

describe('OrganizerEventsPage', () => {
  it('shows only events owned by the signed-in organizer', async () => {
    vi.mocked(eventApi.listEvents).mockResolvedValue([
      { id: 1, organizerId: 7, name: 'Owned event', description: null, location: 'Hanoi', status: 'DRAFT', startTime: '2026-08-01T09:00:00Z', endTime: '2026-08-01T10:00:00Z', bannerUrl: null, createdAt: '' },
      { id: 2, organizerId: 9, name: 'Other event', description: null, location: 'Da Nang', status: 'PUBLISHED', startTime: '2026-08-02T09:00:00Z', endTime: '2026-08-02T10:00:00Z', bannerUrl: null, createdAt: '' },
    ])

    render(<OrganizerEventsPage organizerId={7} />)

    expect(await screen.findByText('Owned event')).toBeInTheDocument()
    expect(screen.queryByText('Other event')).not.toBeInTheDocument()
  })
})
