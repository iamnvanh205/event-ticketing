import { useEffect, useId, useState } from 'react'

interface QrScannerProps {
  enabled?: boolean
  onScan: (qrCode: string) => void
}

export function QrScanner({ enabled = true, onScan }: QrScannerProps) {
  const id = useId().replaceAll(':', '')
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let active = true
    let scanner: import('html5-qrcode').Html5QrcodeScanner | undefined

    void import('html5-qrcode')
      .then(({ Html5QrcodeScanner }) => {
        if (!active) return
        scanner = new Html5QrcodeScanner(id, { fps: 10, qrbox: { width: 240, height: 240 } }, false)
        scanner.render(
          (text) => onScan(text),
          () => undefined,
        )
      })
      .catch(() => {
        if (active) setUnavailable(true)
      })

    return () => {
      active = false
      if (scanner) void scanner.clear()
    }
  }, [enabled, id, onScan])

  return (
    <div className="scanner-box" id={id} aria-label={enabled ? 'QR camera scanner' : 'QR scanner paused'} aria-live="polite">
      {unavailable ? 'Camera scanner unavailable. Use manual entry.' : enabled ? 'Starting camera…' : 'Scanner paused'}
    </div>
  )
}
