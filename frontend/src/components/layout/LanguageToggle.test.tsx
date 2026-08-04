import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLanguage } from '../../lib/language'
import { LanguageProvider } from './LanguageProvider'
import { LanguageToggle } from './LanguageToggle'

function Fixture() {
  const { language } = useLanguage()
  return (
    <div>
      <span data-testid="language">{language}</span>
      <LanguageToggle />
    </div>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('event-ticketing-language', 'en')
  document.documentElement.lang = 'en'
})

describe('LanguageToggle', () => {
  it('switches between English and Vietnamese', async () => {
    const user = userEvent.setup()

    render(
      <LanguageProvider>
        <Fixture />
      </LanguageProvider>,
    )

    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
    expect(screen.getByTestId('language')).toHaveTextContent('en')
    await user.click(screen.getByRole('button', { name: /switch interface language to tiếng việt/i }))
    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('vi'))
    expect(document.documentElement.lang).toBe('vi')
    expect(screen.getByRole('button', { name: /chuyển ngôn ngữ giao diện sang english/i })).toBeInTheDocument()
  })
})
