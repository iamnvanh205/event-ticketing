import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QrScanner } from './QrScanner'

const scanner = vi.hoisted(() => ({
  clear: vi.fn(),
  render: vi.fn(),
}))

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: class {
    clear = scanner.clear
    render = scanner.render
  },
}))

describe('QrScanner', () => {
  it('loads the camera scanner on demand and clears it on unmount', async () => {
    const { unmount } = render(<QrScanner onScan={vi.fn()} />)

    await waitFor(() => expect(scanner.render).toHaveBeenCalledOnce())
    unmount()

    expect(scanner.clear).toHaveBeenCalledOnce()
  })
})
