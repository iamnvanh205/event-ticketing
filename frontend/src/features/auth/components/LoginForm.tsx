import type { FormEvent } from 'react'
import { useState } from 'react'
import { Eye, EyeOff, LoaderCircle, LogIn, UserPlus } from 'lucide-react'
import { GoogleLoginButton } from './GoogleLoginButton'
import { useAuth } from '../hooks/useAuth'

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login, register, loading } = useAuth()

  function selectMode(nextMode: 'login' | 'register') {
    setMode(nextMode)
    setError('')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password })
      } else {
        await register({ email: email.trim(), password, fullName: fullName.trim() })
      }
    } catch {
      setError(mode === 'login' ? 'Email or password is incorrect.' : 'Registration failed. Check your details and try again.')
    }
  }

  return (
    <form className="auth-panel" onSubmit={onSubmit} aria-describedby={error ? 'auth-error' : undefined}>
      <div className="brand-row">
        <div>
          <p className="eyebrow">Welcome</p>
          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <p className="auth-intro">{mode === 'login' ? 'Continue to your tickets or workspace.' : 'Create a customer account in less than a minute.'}</p>
        </div>
        <div className="mode-switch" role="group" aria-label="Authentication mode">
          <button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => selectMode('login')}>Sign in</button>
          <button type="button" aria-pressed={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => selectMode('register')}>Register</button>
        </div>
      </div>

      {mode === 'register' && (
        <label className="field" htmlFor="full-name">
          Full name
          <input autoComplete="name" id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} />
        </label>
      )}

      <label className="field" htmlFor="email">
        Email
        <input autoComplete="email" id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>

      <label className="field" htmlFor="password">
        Password
        <span className="password-field">
          <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          <button className="icon-button" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={`${showPassword ? 'Hide' : 'Show'} entered value`}>
            {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        </span>
        {mode === 'register' && <span className="field-description">Use at least 8 characters.</span>}
      </label>

      {error && <p className="form-error" id="auth-error" role="alert">{error}</p>}

      <button className="primary-action" type="submit" disabled={loading} aria-busy={loading}>
        {loading
          ? <LoaderCircle className="animate-spin" aria-hidden="true" size={18} />
          : mode === 'login' ? <LogIn aria-hidden="true" size={18} /> : <UserPlus aria-hidden="true" size={18} />}
        {loading ? 'Please wait' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>

      <div className="auth-divider"><span>or</span></div>
      <GoogleLoginButton />
      <p className="auth-terms">By continuing, you agree to use Event Ticketing responsibly and keep your credentials secure.</p>
    </form>
  )
}
