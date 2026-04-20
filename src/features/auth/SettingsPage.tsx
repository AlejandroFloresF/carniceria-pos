import { useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

// ── Shared ────────────────────────────────────────────────────────────────────

function Toast({ msg, kind }: { msg: string | null; kind: 'ok' | 'err' }) {
  if (!msg) return null
  return (
    <p className={`text-xs font-medium mt-2 ${kind === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
      {kind === 'ok' ? '✓ ' : '✕ '}{msg}
    </p>
  )
}

// ── Profile Photo ─────────────────────────────────────────────────────────────

function ProfilePhotoSection() {
  const { user, updateProfile } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState<{ text: string; kind: 'ok' | 'err' } | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMsg({ text: 'Selecciona una imagen válida.', kind: 'err' }); return }
    if (file.size > 5_000_000) { setMsg({ text: 'La imagen debe pesar menos de 5 MB.', kind: 'err' }); return }
    const reader = new FileReader()
    reader.onload = async () => {
      setLoading(true); setMsg(null)
      try {
        const base64 = reader.result as string
        await api.put('/auth/profile-photo', { base64DataUrl: base64 })
        updateProfile({ profilePhoto: base64 })
        setMsg({ text: 'Foto actualizada.', kind: 'ok' })
      } catch {
        setMsg({ text: 'Error al guardar la foto.', kind: 'err' })
      } finally { setLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  async function handleRemove() {
    setLoading(true); setMsg(null)
    try {
      await api.put('/auth/profile-photo', { base64DataUrl: null })
      updateProfile({ profilePhoto: null })
      setMsg({ text: 'Foto eliminada.', kind: 'ok' })
    } catch {
      setMsg({ text: 'Error al eliminar.', kind: 'err' })
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Avatar */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="relative group"
        title="Cambiar foto"
      >
        {user?.profilePhoto
          ? <img src={user.profilePhoto} alt="perfil"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-50 group-hover:ring-indigo-200 transition-all" />
          : <div className="w-24 h-24 rounded-full bg-indigo-50 ring-4 ring-indigo-100 group-hover:ring-indigo-200 flex items-center justify-center text-4xl font-light text-indigo-300 transition-all">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
        }
        {/* Overlay */}
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      </button>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <div className="flex items-center gap-3">
        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors disabled:opacity-50">
          {loading ? 'Subiendo...' : 'Cambiar foto'}
        </button>
        {user?.profilePhoto && <>
          <span className="text-gray-200">|</span>
          <button onClick={handleRemove} disabled={loading}
            className="text-sm text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
            Eliminar
          </button>
        </>}
      </div>

      {msg && <Toast msg={msg.text} kind={msg.kind} />}
    </div>
  )
}

// ── Editable Field Row ────────────────────────────────────────────────────────

function FieldRow({
  label, value, type = 'text', placeholder, minLength, maxLength, confirmLabel,
  onSave,
}: {
  label: string
  value?: string | null
  type?: string
  placeholder?: string
  minLength?: number
  maxLength?: number
  confirmLabel?: string
  onSave: (val: string, extra?: string) => Promise<void>
}) {
  const [editing,  setEditing]  = useState(false)
  const [val,      setVal]      = useState('')
  const [extra,    setExtra]    = useState('') // for password: confirm current
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState<{ text: string; kind: 'ok' | 'err' } | null>(null)

  function open() { setVal(''); setExtra(''); setMsg(null); setEditing(true) }
  function close() { setEditing(false); setMsg(null) }

  async function handleSave() {
    setLoading(true); setMsg(null)
    try {
      await onSave(val, extra || undefined)
      setMsg({ text: 'Guardado.', kind: 'ok' })
      setEditing(false)
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.error ?? 'Error al guardar.', kind: 'err' })
    } finally { setLoading(false) }
  }

  const isPassword = type === 'password'
  const canSave    = isPassword
    ? extra.length > 0 && val.length >= (minLength ?? 1)
    : val.trim().length >= (minLength ?? 1)

  return (
    <div className="py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>
          {!editing && (
            <p className="text-sm text-gray-800 truncate">
              {isPassword ? '••••••••' : (value || <span className="text-gray-400 italic">No configurado</span>)}
            </p>
          )}
        </div>
        {!editing && (
          <button onClick={open}
            className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
            Editar
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2">
          {isPassword && (
            <input
              type="password"
              className="input-base"
              placeholder="Contraseña actual"
              value={extra}
              maxLength={255}
              autoFocus
              onChange={e => setExtra(e.target.value)}
            />
          )}
          <input
            type={type}
            className="input-base"
            placeholder={placeholder ?? confirmLabel ?? label}
            value={val}
            minLength={minLength}
            maxLength={maxLength}
            autoFocus={!isPassword}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave() }}
          />
          {msg && <Toast msg={msg.text} kind={msg.kind} />}
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSave}
              disabled={loading || !canSave}
              className="btn-primary flex-1 text-sm"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={close} className="btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!editing && msg && <Toast msg={msg.text} kind={msg.kind} />}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, updateProfile } = useAuthStore()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

      {/* Header */}
      <div className="mb-1">
        <h1 className="text-lg font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-400">Perfil y seguridad</p>
      </div>

      {/* Photo card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <ProfilePhotoSection />
      </div>

      {/* Account fields card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5">

        <FieldRow
          label="Nombre de usuario"
          value={user?.username}
          placeholder="Nuevo nombre de usuario"
          maxLength={100}
          onSave={async (val) => {
            const { data } = await api.put<{ username: string }>('/auth/username', { newUsername: val })
            updateProfile({ username: data.username })
          }}
        />

        <FieldRow
          label="Correo electrónico"
          value={user?.email}
          type="email"
          placeholder="nuevo@correo.com"
          maxLength={200}
          onSave={async (val) => {
            const { data } = await api.put<{ email: string }>('/auth/email', { newEmail: val })
            updateProfile({ email: data.email })
          }}
        />

        <FieldRow
          label="Contraseña"
          type="password"
          placeholder="Nueva contraseña (mín. 8 caracteres)"
          minLength={8}
          maxLength={255}
          onSave={async (newPass, currentPass) => {
            await api.put('/auth/change-password', {
              currentPassword: currentPass,
              newPassword: newPass,
            })
          }}
        />

      </div>

    </div>
  )
}
