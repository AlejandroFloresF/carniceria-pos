import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function LoginPanel() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [open,     setOpen]     = useState(false)
  const login = useAuthStore(s => s.login)

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
      login(data.token, { username: data.username, role: data.role as 'Admin' | 'Cashier' })
    } catch {
      setError('Usuario o contraseña incorrectos.')
    } finally {
      setLoading(false)
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
    </div>
  )
}
