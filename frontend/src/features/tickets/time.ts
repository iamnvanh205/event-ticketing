export function secondsUntil(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) return 0
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000))
}

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
