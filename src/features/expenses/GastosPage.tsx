import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { usePosStore } from '@/store/posStore'
import {
  useScheduledExpenses, useExpenseRequests, useCreateScheduledExpense,
  useUpdateScheduledExpense, useToggleScheduledExpense, useDeleteScheduledExpense,
  useCreateExpenseRequest, useReviewExpenseRequest,
} from './hooks/useExpenses'
import { EXPENSE_CATEGORIES, RECURRENCE_OPTIONS, RECURRENCE_LABEL } from './types/expense.types'
import type { ScheduledExpense, ExpenseRequest } from './types/expense.types'

type AdminTab = 'solicitudes' | 'programados' | 'historial'

const STATUS_STYLE: Record<string, string> = {
  Pending:  'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Denied:   'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<string, string> = {
  Pending: 'Pendiente', Approved: 'Aprobado', Denied: 'Denegado',
}

interface Props { focusRequestId?: string; onClearFocus?: () => void }

export function GastosPage({ focusRequestId, onClearFocus }: Props) {
  const { isAdmin, user } = useAuthStore()
  return isAdmin()
    ? <AdminView focusRequestId={focusRequestId} onClearFocus={onClearFocus} />
    : <CashierView focusRequestId={focusRequestId} onClearFocus={onClearFocus} />
}

// ─── Admin View ───────────────────────────────────────────────────────────────

function AdminView({ focusRequestId, onClearFocus }: Props) {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<AdminTab>('solicitudes')
  const [reviewingRequest, setReviewingRequest] = useState<ExpenseRequest | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [showDenyModal, setShowDenyModal] = useState(false)
  const [scheduledModal, setScheduledModal] = useState(false)
  const [editingScheduled, setEditingScheduled] = useState<ScheduledExpense | null>(null)
  const [successBanner, setSuccessBanner] = useState<{ description: string; amount: number; approved: boolean } | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const { data: pending = [] }   = useExpenseRequests('Pending')
  const { data: history = [] }   = useExpenseRequests()
  const { data: scheduled = [] } = useScheduledExpenses()
  const review = useReviewExpenseRequest()

  // Auto-open request from notification
  useEffect(() => {
    if (focusRequestId) {
      const req = [...pending, ...history].find(r => r.id === focusRequestId)
      if (req) {
        setTab(req.status === 'Pending' ? 'solicitudes' : 'historial')
        if (req.status === 'Pending') setReviewingRequest(req)
      }
      onClearFocus?.()
    }
  }, [focusRequestId])

  function showSuccess(description: string, amount: number, approved: boolean) {
    setSuccessBanner({ description, amount, approved })
    setTimeout(() => setSuccessBanner(null), 4000)
  }

  async function handleApprove(req: ExpenseRequest) {
    try {
      await review.mutateAsync({ id: req.id, approved: true, reviewedBy: user?.username ?? 'Admin' })
      setReviewingRequest(null)
      showSuccess(req.description, req.amount, true)
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Error al aprobar la solicitud'
      setErrorBanner(msg)
      setTimeout(() => setErrorBanner(null), 5000)
    }
  }

  function openDeny(req: ExpenseRequest) {
    setReviewingRequest(req)
    setDenyReason('')
    setShowDenyModal(true)
  }

  async function handleDeny() {
    if (!reviewingRequest) return
    await review.mutateAsync({
      id: reviewingRequest.id, approved: false,
      reviewedBy: user?.username ?? 'Admin', denyReason: denyReason || undefined,
    })
    showSuccess(reviewingRequest.description, reviewingRequest.amount, false)
    setShowDenyModal(false)
    setReviewingRequest(null)
  }

  const historyFiltered = history.filter(r => r.status !== 'Pending')
  const monthSpent = history
    .filter(r => r.status === 'Approved' && new Date(r.requestedAt) > new Date(Date.now() - 30 * 86400000))
    .reduce((s, r) => s + r.amount, 0)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-medium text-gray-900">Gastos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Control de gastos programados y solicitudes</p>
      </div>

      {/* Error banner — insufficient cash */}
      {errorBanner && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-sm text-red-800">
          <span className="text-lg leading-none mt-0.5">⚠</span>
          <div>
            <p className="font-semibold">No se pudo aprobar el pago</p>
            <p className="mt-0.5 text-red-700">{errorBanner}</p>
          </div>
          <button onClick={() => setErrorBanner(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs leading-none">✕</button>
        </div>
      )}

      {/* Success / deny banner */}
      {successBanner && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium animate-pulse-once ${
          successBanner.approved
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          <span className="text-lg">{successBanner.approved ? '✓' : '✕'}</span>
          <div>
            <span className="font-semibold">{successBanner.approved ? 'Pago aprobado' : 'Solicitud denegada'}: </span>
            {successBanner.description}
            {successBanner.approved && (
              <span className="ml-1 text-green-700 font-semibold">${successBanner.amount.toFixed(2)} descontado de caja</span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Pendientes de aprobar', value: pending.length, color: pending.length > 0 ? 'text-amber-600' : 'text-gray-900' },
          { label: 'Gastos programados',    value: scheduled.filter(s => s.isActive).length, color: 'text-gray-900' },
          { label: 'Gastado este mes',      value: `$${monthSpent.toFixed(2)}`, color: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-medium mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 -mt-2">
        {([
          { id: 'solicitudes' as AdminTab, label: `Solicitudes${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { id: 'programados' as AdminTab, label: 'Programados' },
          { id: 'historial'  as AdminTab, label: 'Historial'   },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-5 py-2.5 text-sm transition-colors border-b-2"
            style={tab === t.id
              ? { color: '#6366f1', borderBottomColor: '#6366f1', fontWeight: 500 }
              : { color: '#6b7280', borderBottomColor: 'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Solicitudes pendientes */}
      {tab === 'solicitudes' && (
        <div className="flex flex-col gap-3">
          {pending.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
              Sin solicitudes pendientes
            </div>
          ) : pending.map(req => (
            <div key={req.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{req.description}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{req.category}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {req.requestedBy} · {new Date(req.requestedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                {req.notes && <p className="text-xs text-gray-400 mt-0.5 italic">"{req.notes}"</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium text-gray-900">${req.amount.toFixed(2)}</span>
                <button onClick={() => handleApprove(req)} disabled={review.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-40">
                  Aprobar
                </button>
                <button onClick={() => openDeny(req)} disabled={review.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                  Denegar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Programados */}
      {tab === 'programados' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingScheduled(null); setScheduledModal(true) }}
              className="px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors"
              style={{ backgroundColor: '#6366f1' }}>
              + Nuevo gasto programado
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {scheduled.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Sin gastos programados</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Categoría</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Monto</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Recurrencia</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Próximo vence</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduled.map(e => (
                    <tr key={e.id} className={`border-b border-gray-50 last:border-0 ${!e.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {e.name}
                        {e.isOverdue  && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Vencido</span>}
                        {e.isUpcoming && !e.isOverdue && <span className="ml-2 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Próximo</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{e.category}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">${e.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{RECURRENCE_LABEL[e.recurrence]}</td>
                      <td className={`px-4 py-3 text-xs ${e.isOverdue ? 'text-red-600 font-medium' : e.isUpcoming ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                        {new Date(e.nextDueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setEditingScheduled(e); setScheduledModal(true) }}
                            className="text-xs border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 px-2.5 py-1 rounded-lg transition-all hover:bg-indigo-50">
                            Editar
                          </button>
                          <ToggleActiveButton id={e.id} isActive={e.isActive} />
                          <DeleteScheduledButton id={e.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Historial */}
      {tab === 'historial' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {historyFiltered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sin historial</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Descripción</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cajero</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Monto</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Revisado por</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historyFiltered.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      <p>{r.description}</p>
                      {r.denyReason && <p className="text-xs text-red-500 mt-0.5">"{r.denyReason}"</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.requestedBy}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">${r.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.reviewedBy ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(r.requestedAt).toLocaleDateString('es-MX', { dateStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal denegar */}
      {showDenyModal && reviewingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDenyModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}>
            <p className="font-medium text-gray-900">Denegar solicitud</p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
              <p className="font-medium">{reviewingRequest.description}</p>
              <p className="text-gray-500">{reviewingRequest.requestedBy} · ${reviewingRequest.amount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Motivo (opcional)</label>
              <input className="input-base" placeholder="Ej. Presupuesto insuficiente"
                value={denyReason} onChange={e => setDenyReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDenyModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleDeny} disabled={review.isPending}
                className="flex-1 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium disabled:opacity-40">
                {review.isPending ? 'Denegando...' : 'Denegar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear/editar gasto programado */}
      {scheduledModal && (
        <ScheduledExpenseModal
          editing={editingScheduled}
          onClose={() => { setScheduledModal(false); setEditingScheduled(null) }}
        />
      )}
    </div>
  )
}

// ─── Cashier View ─────────────────────────────────────────────────────────────

function CashierView({ focusRequestId, onClearFocus }: Props) {
  const session     = usePosStore(s => s.session)
  const [showModal, setShowModal] = useState(false)
  const [payScheduled, setPayScheduled] = useState<ScheduledExpense | null>(null)
  const { data: scheduled = [] } = useScheduledExpenses()
  const { data: myRequests = [] } = useExpenseRequests(undefined, session?.cashierName)

  useEffect(() => {
    if (focusRequestId) { setShowModal(false); onClearFocus?.() }
  }, [focusRequestId])

  const upcoming = scheduled.filter(e => e.isActive && (e.isUpcoming || e.isOverdue))

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra gastos del turno</p>
        </div>
        <button onClick={() => { setPayScheduled(null); setShowModal(true) }}
          className="px-4 py-2 text-sm text-white rounded-lg font-medium"
          style={{ backgroundColor: '#6366f1' }}>
          + Registrar gasto
        </button>
      </div>

      {/* Pagos próximos */}
      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-700">Pagos próximos</p>
          {upcoming.map(e => (
            <div key={e.id}
              className={`flex items-center justify-between p-3 rounded-xl border ${e.isOverdue ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              <div>
                <p className={`text-sm font-medium ${e.isOverdue ? 'text-red-700' : 'text-amber-700'}`}>{e.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {e.isOverdue ? 'Vencido · ' : 'Vence '}
                  {new Date(e.nextDueDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  {' · '}{RECURRENCE_LABEL[e.recurrence]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">${e.amount.toFixed(2)}</span>
                <button onClick={() => { setPayScheduled(e); setShowModal(true) }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${e.isOverdue ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                  Solicitar pago
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mis solicitudes */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-700">Mis solicitudes</p>
        {myRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin solicitudes en este turno</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {myRequests.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{r.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.category} · {new Date(r.requestedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {r.denyReason && <p className="text-xs text-red-500 mt-0.5">Motivo: {r.denyReason}</p>}
                </div>
                <span className="font-medium text-sm text-gray-900">${r.amount.toFixed(2)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ExpenseRequestModal
          session={session}
          prefill={payScheduled}
          onClose={() => { setShowModal(false); setPayScheduled(null) }}
        />
      )}
    </div>
  )
}

// ─── Shared Modals ────────────────────────────────────────────────────────────

function ScheduledExpenseModal({ editing, onClose }: { editing: ScheduledExpense | null; onClose: () => void }) {
  const create = useCreateScheduledExpense()
  const update = useUpdateScheduledExpense()
  const today  = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    name:            editing?.name ?? '',
    description:     editing?.description ?? '',
    amount:          editing ? String(editing.amount) : '',
    category:        editing?.category ?? 'Servicios',
    recurrence:      editing?.recurrence ?? 'Monthly',
    nextDueDate:     editing ? editing.nextDueDate.split('T')[0] : today,
    alertDaysBefore: String(editing?.alertDaysBefore ?? 3),
  })
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const amount = parseFloat(form.amount)
    if (!form.name.trim())  { setError('El nombre es requerido'); return }
    if (!amount || amount <= 0) { setError('Monto inválido'); return }
    if (!form.nextDueDate)  { setError('La fecha es requerida'); return }
    const body = {
      name: form.name.trim(), amount, category: form.category, recurrence: form.recurrence,
      nextDueDate: new Date(form.nextDueDate).toISOString(),
      alertDaysBefore: parseInt(form.alertDaysBefore) || 3,
      description: form.description.trim() || undefined,
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...body })
      else         await create.mutateAsync(body)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al guardar')
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-900">
            {editing ? 'Editar gasto programado' : 'Nuevo gasto programado'}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nombre *</label>
            <input className="input-base" placeholder="Ej. Luz CFE"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Monto esperado *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" className="input-base pl-6" placeholder="0.00" min="0.01" step="0.01"
                  value={form.amount} onFocus={e => e.target.select()}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Categoría</label>
              <select className="input-base" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Recurrencia</label>
              <select className="input-base" value={form.recurrence}
                onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
                {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Próxima fecha</label>
              <input type="date" className="input-base" value={form.nextDueDate}
                onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Alertar (días antes)</label>
            <input type="number" className="input-base" min="1" max="30"
              value={form.alertDaysBefore}
              onChange={e => setForm(f => ({ ...f, alertDaysBefore: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notas (opcional)</label>
            <input className="input-base" placeholder="Ej. Contrato #1234"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={submit} disabled={isPending}
              className="flex-1 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-40"
              style={{ backgroundColor: '#6366f1' }}>
              {isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear gasto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExpenseRequestModal({
  session, prefill, onClose,
}: {
  session: { id: string; cashierName: string } | null
  prefill:  ScheduledExpense | null
  onClose:  () => void
}) {
  const create = useCreateExpenseRequest()
  const [form, setForm] = useState({
    description: prefill?.name ?? '',
    amount:      prefill ? String(prefill.amount) : '',
    category:    prefill?.category ?? 'Otro',
    notes:       '',
  })
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const amount = parseFloat(form.amount)
    if (!form.description.trim()) { setError('La descripción es requerida'); return }
    if (!amount || amount <= 0)   { setError('Monto inválido'); return }
    try {
      await create.mutateAsync({
        description: form.description.trim(),
        amount,
        category:           form.category,
        requestedBy:        session?.cashierName ?? 'Cajero',
        sessionId:          session?.id,
        scheduledExpenseId: prefill?.id,
        notes:              form.notes.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al enviar solicitud')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-900">Solicitar gasto</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {prefill && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-700">
              Pago de gasto programado: <strong>{prefill.name}</strong>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Descripción *</label>
            <input className="input-base" placeholder="Ej. Desayuno del turno"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" className="input-base pl-6" placeholder="0.00" min="0.01" step="0.01"
                  value={form.amount} onFocus={e => e.target.select()}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Categoría</label>
              <select className="input-base" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notas (opcional)</label>
            <input className="input-base" placeholder="Información adicional"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            Esta solicitud requiere autorización del administrador antes de efectuarse.
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={submit} disabled={create.isPending}
              className="flex-1 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-40"
              style={{ backgroundColor: '#6366f1' }}>
              {create.isPending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const toggle = useToggleScheduledExpense()
  return (
    <button onClick={() => toggle.mutate(id)} disabled={toggle.isPending}
      className={`text-xs border px-2.5 py-1 rounded-lg transition-all disabled:opacity-40 ${
        isActive
          ? 'border-gray-200 hover:border-orange-200 hover:text-orange-600 hover:bg-orange-50'
          : 'border-gray-200 hover:border-green-300 hover:text-green-700 hover:bg-green-50'
      }`}>
      {isActive ? 'Desactivar' : 'Activar'}
    </button>
  )
}

function DeleteScheduledButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false)
  const del = useDeleteScheduledExpense()

  if (confirm) {
    return (
      <div className="flex gap-1">
        <button onClick={() => del.mutate(id, { onSuccess: () => setConfirm(false) })}
          disabled={del.isPending}
          className="text-xs border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all disabled:opacity-40">
          {del.isPending ? '...' : 'Confirmar'}
        </button>
        <button onClick={() => setConfirm(false)}
          className="text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 px-2 py-1 rounded-lg transition-all">
          No
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="text-xs border border-gray-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all">
      Eliminar
    </button>
  )
}
