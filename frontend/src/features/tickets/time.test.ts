import { describe, expect, it } from 'vitest'
import { formatCountdown, secondsUntil } from './time'

describe('reservation countdown', () => {
  it('uses the server expiry and never returns a negative value', () => {
    const now = new Date('2026-08-20T10:00:00Z').getTime()
    expect(secondsUntil('2026-08-20T10:07:00Z', now)).toBe(420)
    expect(secondsUntil('2026-08-20T09:59:00Z', now)).toBe(0)
    expect(formatCountdown(125)).toBe('2:05')
  })
})
