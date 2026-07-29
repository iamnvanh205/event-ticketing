export const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export const dateTime = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const dateOnly = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export const timeOnly = new Intl.DateTimeFormat('en', {
  hour: 'numeric',
  minute: '2-digit',
})
