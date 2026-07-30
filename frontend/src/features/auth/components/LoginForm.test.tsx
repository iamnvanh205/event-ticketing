import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'
import { useAuth } from '../hooks/useAuth'

// Mock useAuth Zustand store
vi.mock('../hooks/useAuth')

const mockLogin = vi.fn()
const mockRegister = vi.fn()
const mockGoogleLogin = vi.fn()

function mockAuthStore(overrides?: Partial<ReturnType<typeof useAuth>>) {
  vi.mocked(useAuth).mockReturnValue({
    accessToken: null,
    user: null,
    loading: false,
    login: mockLogin,
    register: mockRegister,
    googleLogin: mockGoogleLogin,
    refresh: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthStore()
})

describe('LoginForm — sign-in mode', () => {
  it('renders sign-in form by default', () => {
    render(<LoginForm />)
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()
  })

  it('calls login with email and password on submit', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(undefined)
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'customer@event.local')
    await user.type(screen.getByLabelText(/password/i), 'Customer@123')
    // The submit button has class "primary-action"; the tab button has class "active"
    const submitBtn = screen.getAllByRole('button', { name: /sign in/i }).find(
      (btn) => btn.getAttribute('type') === 'submit'
    )!
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'customer@event.local',
        password: 'Customer@123',
      })
    })
  })

  it('shows error message when login fails', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Unauthorized'))
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'bad@email.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    const submitBtn = screen.getAllByRole('button', { name: /sign in/i }).find(
      (btn) => btn.getAttribute('type') === 'submit'
    )!
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', () => {
    mockAuthStore({ loading: true })
    render(<LoginForm />)
    const submitBtn = screen.getByRole('button', { name: /please wait/i })
    expect(submitBtn).toBeDisabled()
  })
})

describe('LoginForm — register mode', () => {
  it('shows full name field after switching to register mode', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('calls register with email, password and fullName', async () => {
    const user = userEvent.setup()
    mockRegister.mockResolvedValue(undefined)
    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /register/i }))
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'new@user.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        fullName: 'Test User',
        email: 'new@user.com',
        password: 'Password123!',
      })
    })
  })

  it('shows error message when registration fails', async () => {
    const user = userEvent.setup()
    mockRegister.mockRejectedValue(new Error('Conflict'))
    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /register/i }))
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'dup@user.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
    })
  })
})
