import { useEffect, useRef, useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

// ── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function SuccessMsg({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <p className="text-xs text-green-600 font-medium">{msg}</p>
}

function ErrorMsg({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <p className="text-xs text-red-600">{msg}</p>
}

// ── Profile Photo ─────────────────────────────────────────────────────────────

function ProfilePhotoSection() {
  const { user, updateProfile } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Selecciona una imagen válida.'); return }
    if (file.size > 5_000_000) { setError('La imagen debe pesar menos de 5 MB.'); return }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        await api.put('/auth/profile-photo', { base64DataUrl: base64 })
        updateProfile({ profilePhoto: base64 })
        setSuccess('Foto actualizada.')
      } catch {
        setError('Error al guardar la foto.')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleRemove() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await api.put('/auth/profile-photo', { base64DataUrl: null })
      updateProfile({ profilePhoto: null })
      setSuccess('Foto eliminada.')
    } catch {
      setError('Error al eliminar la foto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Foto de perfil">
      <div className="flex items-center gap-4">
        <div className="relative">
          {user?.profilePhoto
            ? <img src={user.profilePhoto} alt="perfil" className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-100" />
            : <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-2xl text-indigo-300 ring-2 ring-indigo-100">
                {user?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
          }
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="btn-secondary text-xs"
          >
            {loading ? 'Subiendo...' : 'Cambiar foto'}
          </button>
          {user?.profilePhoto && (
            <button onClick={handleRemove} disabled={loading} className="text-xs text-red-500 hover:text-red-700 transition-colors">
              Eliminar foto
            </button>
          )}
        </div>
      </div>
      <div className="mt-2">
        <SuccessMsg msg={success} />
        <ErrorMsg msg={error} />
      </div>
    </Section>
  )
}

// ── OTP helper ────────────────────────────────────────────────────────────────

function OtpStep({
  purpose,
  onSent,
}: {
  purpose: string
  onSent: () => void
}) {
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function sendOtp() {
    setSending(true)
    setError(null)
    try {
      await api.post('/auth/send-otp', { purpose })
      onSent()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al enviar el código.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-500">
        Se enviará un código de verificación a tu correo registrado.
      </p>
      <ErrorMsg msg={error} />
      <button onClick={sendOtp} disabled={sending} className="btn-secondary text-xs self-start">
        {sending ? 'Enviando...' : 'Enviar código'}
      </button>
    </div>
  )
}

// ── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [step,     setStep]     = useState<'form' | 'otp'>('form')
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [otp,      setOtp]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await api.put('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
        otpCode: otp,
      })
      setSuccess('Contraseña actualizada.')
      setCurrent(''); setNext(''); setOtp(''); setStep('form')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al cambiar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Cambiar contraseña">
      {step === 'form' && (
        <div className="flex flex-col gap-3">
          <input
            type="password"
            className="input-base"
            placeholder="Contraseña actual"
            value={current}
            maxLength={255}
            onChange={e => setCurrent(e.target.value)}
          />
          <input
            type="password"
            className="input-base"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            value={next}
            minLength={8}
            maxLength={255}
            onChange={e => setNext(e.target.value)}
          />
          <button
            onClick={() => setStep('otp')}
            disabled={!current || next.length < 8}
            className="btn-secondary text-xs self-start"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="flex flex-col gap-3">
          <OtpStep purpose="change-password" onSent={() => {}} />
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              className="input-base tracking-widest text-center text-lg"
              placeholder="Código OTP"
              value={otp}
              maxLength={6}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            />
            <ErrorMsg msg={error} />
            <div className="flex gap-2">
              <button type="submit" disabled={loading || otp.length < 6} className="btn-primary flex-1">
                {loading ? 'Guardando...' : 'Confirmar'}
              </button>
              <button type="button" onClick={() => { setStep('form'); setError(null) }} className="btn-secondary">
                Atrás
              </button>
            </div>
          </form>
        </div>
      )}
      <SuccessMsg msg={success} />
    </Section>
  )
}

// ── Change Username ───────────────────────────────────────────────────────────

function ChangeUsernameSection() {
  const { user, updateProfile } = useAuthStore()
  const [step,    setStep]    = useState<'form' | 'otp'>('form')
  const [newName, setNewName] = useState('')
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { data } = await api.put<{ username: string }>('/auth/username', {
        newUsername: newName,
        otpCode: otp,
      })
      updateProfile({ username: data.username })
      setSuccess('Usuario actualizado.')
      setNewName(''); setOtp(''); setStep('form')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al cambiar el usuario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Cambiar nombre de usuario">
      <p className="text-xs text-gray-500 mb-3">Usuario actual: <strong>{user?.username}</strong></p>
      {step === 'form' && (
        <div className="flex flex-col gap-3">
          <input
            className="input-base"
            placeholder="Nuevo nombre de usuario"
            value={newName}
            maxLength={100}
            onChange={e => setNewName(e.target.value)}
          />
          <button
            onClick={() => setStep('otp')}
            disabled={!newName.trim() || newName === user?.username}
            className="btn-secondary text-xs self-start"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="flex flex-col gap-3">
          <OtpStep purpose="change-username" onSent={() => {}} />
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              className="input-base tracking-widest text-center text-lg"
              placeholder="Código OTP"
              value={otp}
              maxLength={6}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            />
            <ErrorMsg msg={error} />
            <div className="flex gap-2">
              <button type="submit" disabled={loading || otp.length < 6} className="btn-primary flex-1">
                {loading ? 'Guardando...' : 'Confirmar'}
              </button>
              <button type="button" onClick={() => { setStep('form'); setError(null) }} className="btn-secondary">
                Atrás
              </button>
            </div>
          </form>
        </div>
      )}
      <SuccessMsg msg={success} />
    </Section>
  )
}

// ── Change Email ──────────────────────────────────────────────────────────────

function ChangeEmailSection() {
  const { user, updateProfile } = useAuthStore()
  const [step,     setStep]     = useState<'form' | 'otp'>('form')
  const [newEmail, setNewEmail] = useState('')
  const [otp,      setOtp]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/request-email-change', { newEmail })
      setStep('otp')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al solicitar el cambio.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { data } = await api.post<{ email: string }>('/auth/confirm-email-change', { otpCode: otp })
      updateProfile({ email: data.email })
      setSuccess('Correo actualizado.')
      setNewEmail(''); setOtp(''); setStep('form')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al confirmar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Cambiar correo">
      <p className="text-xs text-gray-500 mb-3">
        Correo actual: <strong>{user?.email ?? 'No configurado'}</strong>
      </p>

      {step === 'form' && (
        <form onSubmit={handleRequest} className="flex flex-col gap-3">
          <input
            type="email"
            className="input-base"
            placeholder="Nuevo correo electrónico"
            value={newEmail}
            maxLength={200}
            onChange={e => setNewEmail(e.target.value)}
          />
          <ErrorMsg msg={error} />
          <button type="submit" disabled={loading || !newEmail} className="btn-secondary text-xs self-start">
            {loading ? 'Enviando...' : 'Enviar código al nuevo correo'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleConfirm} className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">
            Se envió un código de verificación a <strong>{newEmail}</strong>. Ingrésalo para confirmar.
          </p>
          <input
            className="input-base tracking-widest text-center text-lg"
            placeholder="Código OTP"
            value={otp}
            maxLength={6}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          />
          <ErrorMsg msg={error} />
          <div className="flex gap-2">
            <button type="submit" disabled={loading || otp.length < 6} className="btn-primary flex-1">
              {loading ? 'Confirmando...' : 'Confirmar'}
            </button>
            <button type="button" onClick={() => { setStep('form'); setError(null) }} className="btn-secondary">
              Atrás
            </button>
          </div>
        </form>
      )}
      <SuccessMsg msg={success} />
    </Section>
  )
}

// ── Passkey Section ───────────────────────────────────────────────────────────

function PasskeySection() {
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)

  // Fetch passkey status on mount
  useEffect(() => {
    api.get<{ hasPasskey: boolean }>('/auth/me').then(r => setHasPasskey(r.data.hasPasskey))
  }, [])

  async function handleRegister() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      // 1. Get registration options
      const { data: options } = await api.post('/auth/passkey/register-options')

      // 2. Create credential via browser (FaceID / TouchID / Windows Hello)
      const credential = await startRegistration({ optionsJSON: options })

      // 3. Verify with server
      await api.post('/auth/passkey/register-verify', {
        clientDataJson:    credential.response.clientDataJSON,
        attestationObject: credential.response.attestationObject,
      })
      setHasPasskey(true)
      setSuccess('Passkey registrada. Ya puedes iniciar sesión con biométrico.')
    } catch (err: any) {
      const msg = err?.response?.data?.error
      if (msg) setError(msg)
      else if (err?.name === 'NotAllowedError') setError('Registro cancelado.')
      else setError('Error al registrar la passkey.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await api.delete('/auth/passkey')
      setHasPasskey(false)
      setSuccess('Passkey eliminada.')
    } catch {
      setError('Error al eliminar la passkey.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Face ID / Huella digital (Passkey)">
      <p className="text-xs text-gray-500 mb-4">
        Registra tu dispositivo para iniciar sesión con FaceID, TouchID o Windows Hello sin contraseña.
      </p>

      {hasPasskey === null && <p className="text-xs text-gray-400">Cargando...</p>}

      {hasPasskey === false && (
        <button onClick={handleRegister} disabled={loading} className="btn-secondary text-xs">
          {loading ? 'Registrando...' : 'Registrar passkey en este dispositivo'}
        </button>
      )}

      {hasPasskey === true && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-600 font-medium">Passkey activa en este dispositivo</span>
          <button onClick={handleRemove} disabled={loading} className="text-xs text-red-500 hover:text-red-700 transition-colors">
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      )}

      <div className="mt-2">
        <SuccessMsg msg={success} />
        <ErrorMsg msg={error} />
      </div>
    </Section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">Administra tu perfil y seguridad de la cuenta.</p>
      </div>

      <ProfilePhotoSection />
      <ChangeUsernameSection />
      <ChangeEmailSection />
      <ChangePasswordSection />
      <PasskeySection />
    </div>
  )
}
