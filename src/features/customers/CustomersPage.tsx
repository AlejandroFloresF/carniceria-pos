import { useState } from 'react'
import { useCustomers } from '../pos/hooks/useCustomers'
import { useCreateCustomer, useDeleteCustomer, useUpdateCustomer } from '../pos/hooks/useCreateCustomer'
import { useCustomerDetail, useMarkDebtPaid, useSetCustomerPrice, useDeleteCustomerPrice } from '../pos/hooks/useCustomerDebts'
import { useProducts } from '../pos/hooks/useProducts'
import type { Customer } from '../pos/types/pos.types'

// ── Constantes ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1','#0ea5e9','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899','#14b8a6',
  '#f97316','#84cc16',
]

const PRESET_EMOJIS = [
  '🧑','👨','👩','🧔','👴','👵',
  '🏪','🏨','🍽️','🛒','🏠','🏢',
  '⭐','💎','🥩','🍖','🐄','🐖',
]

const REASONS      = ['Expired','ProcessLoss','Damaged','Other']
const REASON_LABELS: Record<string,string> = {
  Expired: 'Vencido', ProcessLoss: 'Merma proceso',
  Damaged: 'Dañado',  Other: 'Otro',
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CustomerForm {
  name:            string
  phone:           string
  address:         string
  discountPercent: number
  color:           string
  emoji:           string
}

const EMPTY_FORM: CustomerForm = {
  name: '', phone: '', address: '',
  discountPercent: 0, color: '#6366f1', emoji: '',
}

type Modal = 'form' | 'detail' | null

// ── Helpers ───────────────────────────────────────────────────────────────────

function validatePhone(value: string): string {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  if (digits.length < 10) return 'Mínimo 10 dígitos'
  if (digits.length > 15) return 'Máximo 15 dígitos'
  return ''
}

// ── CustomerAvatar ────────────────────────────────────────────────────────────

interface AvatarProps {
  customer: { name: string; color?: string; emoji?: string }
  size?: 'sm' | 'md' | 'lg'
}

function CustomerAvatar({ customer, size = 'md' }: AvatarProps) {
  const sizes  = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }
  const emoji  = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }
  const color  = customer.color ?? '#6366f1'

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center shrink-0 font-medium`}
      style={{ backgroundColor: customer.emoji ? `${color}20` : color }}
    >
      {customer.emoji
        ? <span className={emoji[size]}>{customer.emoji}</span>
        : <span className="text-white">{customer.name.charAt(0).toUpperCase()}</span>
      }
    </div>
  )
}

// ── CustomerDetailModal ───────────────────────────────────────────────────────

interface DetailModalProps {
  customer: Customer
  onClose:  () => void
}

function CustomerDetailModal({ customer, onClose }: DetailModalProps) {
  const { data: detail, isLoading } = useCustomerDetail(customer.id)
  const markPaid    = useMarkDebtPaid()
  const setPrice    = useSetCustomerPrice()
  const deletePrice = useDeleteCustomerPrice()
  const { data: products = [] } = useProducts('')
  const [tab, setTab]             = useState<'debts'|'prices'>('debts')
  const [editPrice, setEditPrice] = useState<{ productId: string; value: string }|null>(null)

  const color = customer.color ?? '#6366f1'

  return (
    <div className="modal-overlay">
      <div className="modal max-h-[90vh] overflow-hidden flex flex-col" style={{ maxWidth: '580px' }}>

        {/* Header */}
        <div className="modal-header shrink-0" style={{ borderTop: `3px solid ${color}` }}>
          <div className="flex items-center gap-2.5">
            <CustomerAvatar customer={customer} size="md" />
            <div>
              <span className="modal-title">{customer.name}</span>
              {customer.totalDebt > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  Debe ${customer.totalDebt.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Info */}
        <div
          className="px-5 py-2.5 border-b border-gray-100 flex gap-4 text-xs text-gray-500 shrink-0 flex-wrap"
          style={{ backgroundColor: `${color}08` }}
        >
          {customer.phone  && <span>📞 {customer.phone}</span>}
          {detail?.address && <span>📍 {detail.address}</span>}
          {customer.discountPercent > 0 && (
            <span style={{ color }}>🏷 {customer.discountPercent}% descuento</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {([
            { id: 'debts',  label: `Deudas (${detail?.pendingDebts?.length ?? 0})` },
            { id: 'prices', label: 'Precios especiales' },
          ] as { id: 'debts'|'prices'; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-5 py-3 text-sm transition-colors border-b-2"
              style={tab === t.id
                ? { color, borderBottomColor: color, fontWeight: 500 }
                : { color: '#6b7280', borderBottomColor: 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>

          ) : tab === 'debts' ? (
            <div className="flex flex-col gap-3">
              {!detail?.pendingDebts?.length ? (
                <div className="text-center py-10">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm text-gray-500">Sin deudas pendientes</p>
                  <p className="text-xs text-gray-400 mt-1">Este cliente está al corriente</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg px-4 py-2.5 flex justify-between"
                    style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                    <span className="text-sm" style={{ color }}>Total pendiente</span>
                    <span className="text-sm font-medium" style={{ color }}>
                      ${detail.pendingDebts.reduce((s,d) => s + d.amount, 0).toFixed(2)}
                    </span>
                  </div>

                  {detail.pendingDebts.map(d => (
                    <div key={d.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">${d.amount.toFixed(2)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${color}15`, color }}>
                            #{d.orderFolio}
                          </span>
                          {d.daysPending >= 7 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                              {d.daysPending}d
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(d.createdAt).toLocaleDateString('es-MX', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })} · hace {d.daysPending} {d.daysPending === 1 ? 'día' : 'días'}
                        </p>
                        {/* Nota de la deuda */}
                        {d.note && (
                          <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-500
                                          bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5">
                            <span className="shrink-0">📝</span>
                            <span>{d.note}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => markPaid.mutate(d.id)}
                        disabled={markPaid.isPending}
                        className="shrink-0 text-xs text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: color }}>
                        ✓ Pagado
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-400 mb-3">
                Precios especiales por producto. Sin precio especial se usa el general.
              </p>
              {(products as any[]).map(p => {
                const generalPrice = p.pricePerUnit ?? p.generalPrice ?? 0
                const customPrice  = detail?.customPrices?.find(cp => cp.productId === p.id)
                const isEditing    = editPrice?.productId === p.id

                return (
                  <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">${generalPrice.toFixed(2)}/kg general</p>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-gray-400">$</span>
                        <input
                          type="number" step="0.01" min="0.01"
                          className="input-base w-24 text-right text-sm py-1"
                          value={editPrice!.value}
                          onChange={e => setEditPrice({ productId: p.id, value: e.target.value })}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && editPrice!.value) {
                              await setPrice.mutateAsync({ customerId: customer.id, productId: p.id, customPrice: Number(editPrice!.value) })
                              setEditPrice(null)
                            }
                            if (e.key === 'Escape') setEditPrice(null)
                          }}
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            if (!editPrice!.value) return
                            await setPrice.mutateAsync({ customerId: customer.id, productId: p.id, customPrice: Number(editPrice!.value) })
                            setEditPrice(null)
                          }}
                          disabled={!editPrice!.value || setPrice.isPending}
                          className="text-xs text-white px-2 py-1 rounded disabled:opacity-40"
                          style={{ backgroundColor: color }}>✓
                        </button>
                        <button onClick={() => setEditPrice(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                      </div>

                    ) : customPrice ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-medium" style={{ color }}>
                            ${customPrice.customPrice.toFixed(2)}/kg
                          </span>
                          {generalPrice > 0 && (() => {
                            const diff = (1 - customPrice.customPrice / generalPrice) * 100
                            const abs  = Math.abs(diff).toFixed(0)
                            return diff !== 0 ? (
                              <p className="text-xs" style={{ color: diff > 0 ? color : '#f59e0b' }}>
                                {diff > 0 ? `${abs}% menos` : `${abs}% más`}
                              </p>
                            ) : null
                          })()}
                        </div>
                        <button
                          onClick={() => setEditPrice({ productId: p.id, value: String(customPrice.customPrice) })}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600
                                     border border-gray-200 hover:border-indigo-300 px-2 py-1 rounded-md
                                     transition-all hover:bg-indigo-50">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => deletePrice.mutate({ customerId: customer.id, productId: p.id })}
                          disabled={deletePrice.isPending}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500
                                     border border-gray-200 hover:border-red-200 px-2 py-1 rounded-md
                                     transition-all hover:bg-red-50">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          </svg>
                          Quitar
                        </button>
                      </div>

                    ) : (
                      <button
                        onClick={() => setEditPrice({ productId: p.id, value: '' })}
                        className="shrink-0 text-xs border px-2.5 py-1 rounded-lg transition-colors"
                        style={{ color, borderColor: `${color}40` }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${color}10`)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        + Precio especial
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Customers Page ────────────────────────────────────────────────────────────

export function CustomersPage() {
  const [search, setSearch]                 = useState('')
  const [modal, setModal]                   = useState<Modal>(null)
  const [editing, setEditing]               = useState<Customer | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [form, setForm]                     = useState<CustomerForm>(EMPTY_FORM)
  const [phoneError, setPhoneError]         = useState('')
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  const { data: customers = [], isLoading } = useCustomers(search)
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer() 

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setPhoneError(''); setModal('form')
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({
      name:            c.name,
      phone:           c.phone   ?? '',
      address:         c.address ?? '',
      discountPercent: c.discountPercent,
      color:           c.color   ?? '#6366f1',
      emoji:           (c as any).emoji ?? '',
    })
    setPhoneError('')
    setModal('form')
  }

  function openDetail(c: Customer) {
    setDetailCustomer(c); setModal('detail')
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    const pErr = validatePhone(form.phone)
    if (pErr) { setPhoneError(pErr); return }

    const payload = {
      name:            form.name,
      phone:           form.phone   || undefined,
      address:         form.address || undefined,
      discountPercent: form.discountPercent,
      color:           form.color,
      emoji:           form.emoji   || undefined,
    }

    if (editing) {
      await updateCustomer.mutateAsync({ id: editing.id, ...payload } as any)
    } else {
      await createCustomer.mutateAsync(payload as any)
    }
    setModal(null)
  }

  const totalDebtAll = customers.reduce((s, c) => s + (c.totalDebt ?? 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Precios especiales, deudas y perfiles</p>
        </div>
        <button className="btn-primary !w-auto px-4 py-2 text-sm" onClick={openCreate}>
          + Nuevo
        </button>
      </div>

      {/* Alerta deuda */}
      {totalDebtAll > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-sm text-orange-800">
              {customers.filter(c => c.totalDebt > 0).length} cliente
              {customers.filter(c => c.totalDebt > 0).length !== 1 ? 's' : ''} con saldo pendiente
            </span>
          </div>
          <span className="text-sm font-medium text-orange-800">${totalDebtAll.toFixed(2)}</span>
        </div>
      )}

      {/* Buscador */}
      <input
        className="input-base"
        placeholder="Buscar por nombre..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Tabla */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">Cargando...</p>
      ) : customers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">
            {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </p>
          {!search && (
            <button onClick={openCreate} className="text-indigo-600 text-sm mt-2 hover:underline">
              Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
            <table className="w-full text-sm" style={{ minWidth: '520px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium hidden sm:table-cell">Dirección</th>
                  <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Descuento</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Saldo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => {
                  const clientColor = c.color ?? '#6366f1'
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <CustomerAvatar customer={c} size="sm" />
                          <span className="font-medium text-gray-900 truncate max-w-[130px]">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.phone || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate hidden sm:table-cell">
                        {c.address || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.discountPercent > 0 ? (
                          <span
                            className="text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: `${clientColor}15`, color: clientColor }}>
                            {c.discountPercent}% off
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.totalDebt > 0 ? (
                          <span className="text-sm font-medium text-red-600">${c.totalDebt.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetail(c)}
                            className="text-xs font-medium px-2.5 py-1 rounded-md border transition-all"
                            style={{ color: clientColor, borderColor: `${clientColor}30`, backgroundColor: `${clientColor}08` }}>
                            Ver
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600
                                       border border-gray-200 hover:border-gray-300 px-2.5 py-1 rounded-md
                                       transition-all hover:bg-gray-50">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editar
                          </button>
                          {c.name !== "Público General" && (
                            <button
                              onClick={() => setDeletingCustomer(c)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500
                                         border border-gray-200 hover:border-red-200 px-2.5 py-1 rounded-md
                                         transition-all hover:bg-red-50">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              </svg>
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal formulario ───────────────────────────────── */}
      {modal === 'form' && (
        <div className="modal-overlay">
          <div className="modal max-h-[90vh] overflow-y-auto">
            <div className="modal-header" style={{ borderTop: `3px solid ${form.color}` }}>
              <span className="modal-title">{editing ? 'Editar cliente' : 'Nuevo cliente'}</span>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="modal-body">

              {/* Preview avatar */}
              <div className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ backgroundColor: `${form.color}08`, borderColor: `${form.color}20` }}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 shrink-0"
                  style={{ borderColor: form.color, backgroundColor: form.emoji ? `${form.color}15` : form.color }}>
                  {form.emoji
                    ? <span>{form.emoji}</span>
                    : <span className="text-white text-lg font-medium">
                        {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                      </span>
                  }
                </div>
                <div>
                  <p className="font-medium" style={{ color: form.color }}>
                    {form.name || 'Nombre del cliente'}
                  </p>
                  {form.discountPercent > 0 && (
                    <p className="text-xs" style={{ color: `${form.color}90` }}>
                      {form.discountPercent}% descuento
                    </p>
                  )}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre *</label>
                <input className="input-base" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Juan Pérez" autoFocus />
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Teléfono</label>
                <input
                  className={`input-base ${phoneError ? 'border-red-300' : ''}`}
                  value={form.phone} inputMode="tel"
                  placeholder="Ej. 33 1234 5678"
                  onChange={e => {
                    const val = e.target.value.replace(/[^\d\s\+\-\(\)]/g, '')
                    setForm(f => ({ ...f, phone: val }))
                    setPhoneError(validatePhone(val))
                  }}
                  onBlur={() => setPhoneError(validatePhone(form.phone))}
                />
                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
              </div>

              {/* Dirección */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Dirección</label>
                <input className="input-base" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Ej. Calle Juárez 45, Col. Centro" />
              </div>

              {/* Descuento */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Descuento general</label>
                <div className="flex items-center gap-2">
                  <input
                    className="input-base w-20 text-right" type="number"
                    min={0} max={100} step={1}
                    value={form.discountPercent === 0 ? '' : form.discountPercent}
                    placeholder="0"
                    onChange={e => {
                      const val    = e.target.value
                      const parsed = val === '' ? 0 : Math.min(100, Math.max(0, parseInt(val, 10) || 0))
                      setForm(f => ({ ...f, discountPercent: parsed }))
                    }}
                  />
                  <span className="text-sm text-gray-500">%</span>
                  {form.discountPercent > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${form.color}15`, color: form.color }}>
                      {form.discountPercent}% menos siempre
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Para precios por producto usa "Ver → Precios especiales"
                </p>
              </div>

              {/* Emoji */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">
                  Emoji de perfil <span className="text-gray-400">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_EMOJIS.map(e => (
                    <button key={e} type="button"
                      onClick={() => setForm(f => ({ ...f, emoji: f.emoji === e ? '' : e }))}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center
                                  transition-all border`}
                      style={form.emoji === e
                        ? { borderColor: form.color, backgroundColor: `${form.color}15`,
                            transform: 'scale(1.1)', borderWidth: '2px' }
                        : { borderColor: '#e5e7eb' }}>
                      {e}
                    </button>
                  ))}
                  {/* Input personalizado */}
                  <div className="relative">
                    <input type="text"
                      className="w-9 h-9 rounded-lg border border-dashed border-gray-300
                                 text-center text-lg focus:outline-none"
                      value={!PRESET_EMOJIS.includes(form.emoji) ? form.emoji : ''}
                      onChange={e => {
                        const chars = [...e.target.value]
                        if (chars.length <= 2) setForm(f => ({ ...f, emoji: e.target.value }))
                      }}
                      placeholder="+" title="Emoji personalizado"
                    />
                  </div>
                </div>
                {form.emoji && (
                  <button onClick={() => setForm(f => ({ ...f, emoji: '' }))}
                    className="text-xs text-gray-400 hover:text-red-500">
                    Quitar emoji
                  </button>
                )}
              </div>

              {/* Color */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">Color del cliente</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-all flex items-center justify-center"
                      style={{
                        backgroundColor: c,
                        boxShadow: form.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                        transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}>
                      {form.color === c && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                  {/* Color personalizado */}
                  <div className="relative w-7 h-7">
                    <input type="color" value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300
                                    flex items-center justify-center text-gray-400 text-xs">
                      +
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <button
                className="w-full py-3 px-4 text-white font-medium text-sm rounded-lg
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: form.color }}
                disabled={!form.name.trim() || !!phoneError || createCustomer.isPending || updateCustomer.isPending}
                onClick={handleSubmit}>
                {editing ? 'Guardar cambios' : 'Crear cliente'}
              </button>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal detalle ──────────────────────────────────── */}
      {modal === 'detail' && detailCustomer && (
        <CustomerDetailModal
          customer={detailCustomer}
          onClose={() => { setModal(null); setDetailCustomer(null) }}
        />
      )}
      {deletingCustomer && (
  <div className="modal-overlay">
    <div className="modal" style={{ maxWidth: '400px' }}>
      <div className="modal-header">
        <span className="modal-title">Eliminar cliente</span>
        <button
          onClick={() => setDeletingCustomer(null)}
          className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="modal-body">

        {/* Preview del cliente */}
        <div className="flex items-center gap-3 p-3 rounded-xl border"
          style={{
            backgroundColor: `${deletingCustomer.color ?? '#6366f1'}08`,
            borderColor: `${deletingCustomer.color ?? '#6366f1'}25`,
          }}>
          <CustomerAvatar customer={deletingCustomer} size="md" />
          <div>
            <p className="font-medium text-gray-900">{deletingCustomer.name}</p>
            {deletingCustomer.phone && (
              <p className="text-xs text-gray-500">{deletingCustomer.phone}</p>
            )}
          </div>
        </div>

              {/* Advertencia si tiene deuda */}
              {deletingCustomer.totalDebt > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200
                                rounded-lg px-3 py-2.5">
                  <span className="text-amber-500 shrink-0">⚠</span>
                  <p className="text-xs text-amber-700">
                    Este cliente tiene una deuda pendiente de{' '}
                    <span className="font-medium">${deletingCustomer.totalDebt.toFixed(2)}</span>.
                    Al eliminarlo la deuda quedará sin asignar.
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600">
                ¿Estás seguro que deseas eliminar a{' '}
                <span className="font-medium">{deletingCustomer.name}</span>?
                Esta acción no se puede deshacer.
              </p>

              <button
                className="w-full py-3 px-4 text-white font-medium text-sm rounded-lg
                          bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-colors"
                disabled={deleteCustomer.isPending}
                onClick={async () => {
                  await deleteCustomer.mutateAsync(deletingCustomer.id)
                  setDeletingCustomer(null)
                  // Si el cliente eliminado era el seleccionado en el POS, resetea
                }}>
                {deleteCustomer.isPending ? 'Eliminando...' : 'Sí, eliminar cliente'}
              </button>

              <button
                className="btn-secondary"
                onClick={() => setDeletingCustomer(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    
  )
}