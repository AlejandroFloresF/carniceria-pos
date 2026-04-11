import { useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  token: string
  onClose: () => void
}

export function ResetPasswordModal({ token, onClose }: Props) {
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Token inválido o expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Nueva contraseña</h2>
        {done ? (
          <>
            <p className="text-sm text-gray-500 mt-2">Contraseña actualizada correctamente.</p>
            <button onClick={onClose} className="btn-primary w-full mt-4">Iniciar sesión</button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-3">
            <input
              type="password"
              className="input-base"
              placeholder="Nueva contraseña (mín. 8 caracteres)"
              value={password}
              minLength={8}
              maxLength={255}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              className="input-base"
              placeholder="Confirmar contraseña"
              value={password2}
              maxLength={255}
              onChange={e => setPassword2(e.target.value)}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || password.length < 8 || !password2}
              className="btn-primary"
            >
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
