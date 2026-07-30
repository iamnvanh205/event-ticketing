import { useEffect, useRef, useState } from 'react'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'

interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleAccountsId {
  initialize: (options: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
  }) => void
  renderButton: (parent: HTMLElement, options: {
    theme: 'outline'
    size: 'large'
    type: 'standard'
    text: 'continue_with'
    shape: 'rectangular'
    width?: number
  }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId
      }
    }
  }
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }
  googleScriptPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`)
    const script = existing ?? document.createElement('script')

    script.async = true
    script.defer = true
    script.src = GOOGLE_IDENTITY_SCRIPT
    script.onload = () => resolve()
    script.onerror = () => {
      googleScriptPromise = null
      reject(new Error('Google Identity Services failed to load'))
    }

    if (!existing) {
      document.head.appendChild(script)
    }
  })
  return googleScriptPromise
}

export function GoogleLoginButton() {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const { googleLogin, loading } = useAuth()
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!googleClientId || !buttonRef.current) {
      return
    }

    let cancelled = false
    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return
        }
        buttonRef.current.innerHTML = ''
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          ux_mode: 'popup',
          callback: async (response) => {
            if (!response.credential) {
              return
            }
            setError('')
            try {
              await googleLogin(response.credential)
            } catch {
              setError('Google sign-in failed. Try again.')
            }
          },
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(buttonRef.current.parentElement?.clientWidth || 360, 400),
        })
        setReady(true)
      })
      .catch(() => setError('Google sign-in is unavailable.'))

    return () => {
      cancelled = true
    }
  }, [googleClientId, googleLogin])

  return (
    <div className="google-login-wrap">
      <div ref={buttonRef} className="google-login-slot" style={{ display: ready ? undefined : 'none' }} />
      {!ready && (
        <button className="outline-action" type="button" disabled={!googleClientId || loading} aria-busy={loading}>
          {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" size={18} /> : <KeyRound aria-hidden="true" size={18} />}
          Continue with Google
        </button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
