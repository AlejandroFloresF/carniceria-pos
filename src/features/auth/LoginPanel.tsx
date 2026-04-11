import { useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { ForgotPasswordModal } from './ForgotPasswordModal'

async function fetchAndMergeProfile(
  token: string,
  loginFn: (token: string, user: { username: string; role: 'Admin' | 'Cashier' }) => void,
  updateFn: (patch: { email?: string | null; profilePhoto?: string | null }) => void,
  userData: { username: string; role: 'Admin' | 'Cashier' }
) {
  loginFn(token, userData)
  try {
    const { data } = await api.get<{ email?: string; profilePhoto?: string }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    updateFn({ email: data.email ?? null, profilePhoto: data.profilePhoto ?? null })
  } catch {
    // non-critical, ignore
  }
}

export function LoginPanel() {
  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [open,        setOpen]        = useState(false)
  const [showForgot,  setShowForgot]  = useState(false)
  const login         = useAuthStore(s => s.login)
  const updateProfile = useAuthStore(s => s.updateProfile)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<{ token: string; username: string; role: string }>(
        '/auth/login',
        { username: username.trim().toLowerCase(), password }
      )
      await fetchAndMergeProfile(
        data.token, login, updateProfile,
        { username: data.username, role: data.role as 'Admin' | 'Cashier' }
      )
    } catch {
      setError('Usuario o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasskeyLogin() {
    if (!username.trim()) { setError('Ingresa tu nombre de usuario primero.'); return }
    setPasskeyLoading(true)
    setError(null)
    try {
      // 1. Get auth options from server
      const { data: options } = await api.post('/auth/passkey/auth-options', {
        username: username.trim().toLowerCase()
      })

      // 2. Invoke browser authenticator (FaceID / TouchID / Windows Hello)
      const credential = await startAuthentication({ optionsJSON: options })

      // 3. Verify with server
      const { data } = await api.post<{ token: string; username: string; role: string }>(
        '/auth/passkey/auth-verify',
        {
          clientDataJson:    credential.response.clientDataJSON,
          authenticatorData: credential.response.authenticatorData,
          signature:         credential.response.signature,
          credentialId:      credential.id,
        }
      )
      await fetchAndMergeProfile(
        data.token, login, updateProfile,
        { username: data.username, role: data.role as 'Admin' | 'Cashier' }
      )
    } catch (err: any) {
      const msg = err?.response?.data?.error
      if (msg) setError(msg)
      else if (err?.name === 'NotAllowedError') setError('Autenticación cancelada.')
      else setError('Error al autenticar con biométrico.')
    } finally {
      setPasskeyLoading(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-4 text-center">
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors underline underline-offset-2"
        >
          Acceso administrativo
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500 font-medium mb-3">Acceso administrativo</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-2">
          <input
            className="input-base"
            placeholder="Usuario"
            value={username}
            autoComplete="username"
            maxLength={100}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            className="input-base"
            type="password"
            placeholder="Contraseña"
            value={password}
            autoComplete="current-password"
            maxLength={255}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="btn-primary flex-1"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null) }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Passkey / biometric login */}
        <button
          type="button"
          onClick={handlePasskeyLogin}
          disabled={passkeyLoading}
          className="mt-2 w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-lg py-2 transition-colors disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          {passkeyLoading ? 'Verificando...' : 'Iniciar con Face ID / Huella'}
        </button>

        {/* Forgot password */}
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors underline underline-offset-2"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  )
}
