import { useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  onClose: () => void
}

export function ForgotPasswordModal({ onClose }: Props) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Error al enviar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Recuperar contraseña</h2>
        {sent ? (
          <>
            <p className="text-sm text-gray-500 mt-2">
              Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña.
            </p>
            <button onClick={onClose} className="btn-primary w-full mt-4">Cerrar</button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                className="input-base"
                placeholder="correo@ejemplo.com"
                value={email}
                maxLength={200}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
