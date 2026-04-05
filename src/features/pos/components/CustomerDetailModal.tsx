import { useState } from 'react'
import { useCustomerDetail, useMarkDebtPaid, useSetCustomerPrice, useDeleteCustomerPrice } from '../hooks/useCustomerDebts'
import { useProducts } from '../hooks/useProducts'
import { useTicketByOrder } from '../hooks/useTicket'
import { TicketView } from './TicketView'
import { fmt } from '@/lib/fmt'
import type { Customer, CustomerDebt } from '../types/pos.types'

interface Props {
  customer: Customer
  onClose:  () => void
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function CustomerAvatar({ customer, size = 'md' }: {
  customer: { name: string; color?: string; emoji?: string }
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  const emojis = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' }
  const color  = customer.color ?? '#6366f1'

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center shrink-0 font-medium`}
      style={{ backgroundColor: customer.emoji ? `${color}20` : color }}
    >
      {customer.emoji
        ? <span className={emojis[size]}>{customer.emoji}</span>
        : <span className="text-white">{customer.name.charAt(0).toUpperCase()}</span>
      }
    </div>
  )
}

// ── Ticket Modal (ver ticket sin pagar) ───────────────────────────────────────
function TicketModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data: ticket, isLoading } = useTicketByOrder(orderId)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando ticket...</div>
        ) : ticket ? (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-base font-medium text-gray-900">Ticket #{ticket.folio}</span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <TicketView ticket={ticket} onNewSale={onClose} closeLabel="Cerrar" />
          </>
        ) : (
          <div className="p-8 text-center text-sm text-gray-400">Ticket no encontrado</div>
        )}
      </div>
    </div>
  )
}

// ── Debt Payment Modal ─────────────────────────────────────────────────────────
function DebtPaymentModal({
  debt,
  customer,
  onConfirm,
  onClose,
}: {
  debt: CustomerDebt
  customer: Customer
  onConfirm: () => void
  onClose: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const { data: ticket, isLoading } = useTicketByOrder(debt.orderId)
  const color = customer.color ?? '#6366f1'

  function handleConfirm() {
    onConfirm()
    setConfirmed(true)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-base font-medium text-gray-900">
            {confirmed ? '✅ Pago registrado' : 'Confirmar pago'}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {!confirmed ? (
          // ── Paso 1: confirmar ──────────────────────────────
          <div className="p-5 flex flex-col gap-4">
            {/* Monto */}
            <div
              className="rounded-lg px-4 py-3 text-center"
              style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}
            >
              <p className="text-xs text-gray-500 mb-1">Monto pendiente</p>
              <p className="text-2xl font-semibold" style={{ color }}>${fmt(debt.amount)}</p>
              <p className="text-xs text-gray-400 mt-1">
                Folio #{debt.orderFolio} · {new Date(debt.createdAt).toLocaleDateString('es-MX')}
              </p>
            </div>

            {/* Nota de la deuda */}
            {debt.note && (
              <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2">
                <span className="shrink-0">📝</span>
                <span>{debt.note}</span>
              </div>
            )}

            {/* Detalle de la compra */}
            {isLoading ? (
              <p className="text-xs text-gray-400 text-center py-2">Cargando detalle...</p>
            ) : ticket ? (
              <div className="flex flex-col gap-1.5 border border-gray-100 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Lo que se llevó</p>
                {ticket.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-700">
                      {item.productName}
                      <span className="text-gray-400 ml-1">({item.quantity} {item.unit})</span>
                    </span>
                    <span className="text-gray-600 font-medium">${fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Botones */}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
              <button
                onClick={handleConfirm}
                className="flex-1 text-sm text-white px-4 py-2.5 rounded-lg font-medium"
                style={{ backgroundColor: color }}
              >
                Confirmar pago
              </button>
            </div>
          </div>
        ) : (
          // ── Paso 2: ticket para imprimir ───────────────────
          isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Cargando ticket...</div>
          ) : ticket ? (
            <TicketView ticket={ticket} onNewSale={onClose} closeLabel="Cerrar" />
          ) : (
            <div className="p-5 text-center flex flex-col gap-3">
              <p className="text-sm text-gray-500">Pago registrado correctamente</p>
              <button onClick={onClose} className="btn-primary">Cerrar</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CustomerDetailModal({ customer, onClose }: Props) {
  const { data: detail, isLoading } = useCustomerDetail(customer.id)
  const markPaid    = useMarkDebtPaid()
  const setPrice    = useSetCustomerPrice()
  const deletePrice = useDeleteCustomerPrice()
  const { data: products = [] } = useProducts('')

  const [tab, setTab]               = useState<'debts' | 'prices'>('debts')
  const [editPrice, setEditPrice]   = useState<{ productId: string; value: string } | null>(null)
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null)
  const [pendingPayment, setPendingPayment] = useState<CustomerDebt | null>(null)

  const color = customer.color ?? '#6366f1'
  const liveDebt = detail
    ? detail.pendingDebts.reduce((s, d) => s + d.amount, 0)
    : customer.totalDebt

  return (
    <>
      <div className="modal-overlay">
        <div
          className="modal max-h-[90vh] overflow-hidden flex flex-col"
          style={{ maxWidth: '600px' }}
        >
          {/* ── Header ────────────────────────────────────────── */}
          <div
            className="modal-header shrink-0"
            style={{ borderTop: `3px solid ${color}` }}
          >
            <div className="flex items-center gap-2.5">
              <CustomerAvatar customer={customer} size="md" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="modal-title">{customer.name}</span>
                  {liveDebt > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      Debe ${fmt(liveDebt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
            >
              ✕
            </button>
          </div>

          {/* ── Info básica ───────────────────────────────────── */}
          <div
            className="px-5 py-2.5 border-b border-gray-100 flex gap-4 text-xs
                       text-gray-500 shrink-0 flex-wrap"
            style={{ backgroundColor: `${color}08` }}
          >
            {customer.phone && (
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.28a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                {customer.phone}
              </span>
            )}
            {detail?.address && (
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {detail.address}
              </span>
            )}
            {customer.discountPercent > 0 && (
              <span className="flex items-center gap-1" style={{ color }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                {customer.discountPercent}% descuento
              </span>
            )}
          </div>

          {/* ── Tabs ──────────────────────────────────────────── */}
          <div className="flex border-b border-gray-100 shrink-0">
            {([
              { id: 'debts',  label: `Deudas (${detail?.pendingDebts?.length ?? 0})` },
              { id: 'prices', label: 'Precios especiales' },
            ] as { id: 'debts' | 'prices'; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-5 py-3 text-sm transition-colors border-b-2"
                style={tab === t.id
                  ? { color, borderBottomColor: color, fontWeight: 500 }
                  : { color: '#6b7280', borderBottomColor: 'transparent' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Content ───────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 p-5">
            {isLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>

            ) : tab === 'debts' ? (
              /* ── Deudas ──────────────────────────────────────── */
              <div className="flex flex-col gap-3">
                {!detail?.pendingDebts?.length ? (
                  <div className="text-center py-10">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-sm text-gray-500">Sin deudas pendientes</p>
                    <p className="text-xs text-gray-400 mt-1">Este cliente está al corriente</p>
                  </div>
                ) : (
                  <>
                    {/* Total pendiente */}
                    <div
                      className="rounded-lg px-4 py-2.5 flex justify-between items-center"
                      style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}
                    >
                      <span className="text-sm font-medium" style={{ color }}>Total pendiente</span>
                      <span className="text-sm font-medium" style={{ color }}>
                        ${fmt(detail.pendingDebts.reduce((s, d) => s + d.amount, 0))}
                      </span>
                    </div>

                    {detail.pendingDebts.map(d => (
                      <div
                        key={d.id}
                        className="flex items-start gap-3 p-3.5 border border-gray-100
                                   rounded-xl hover:border-gray-200 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          {/* Monto + folio clickeable */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">
                              ${fmt(d.amount)}
                            </span>
                            <button
                              onClick={() => setViewingOrderId(d.orderId)}
                              className="text-xs px-2 py-0.5 rounded-full cursor-pointer
                                         hover:opacity-80 transition-opacity flex items-center gap-1"
                              style={{ backgroundColor: `${color}15`, color }}
                              title="Ver ticket completo"
                            >
                              #{d.orderFolio}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                            </button>
                            {d.daysPending >= 7 && (
                              <span className="text-xs bg-red-100 text-red-600
                                               px-2 py-0.5 rounded-full">
                                {d.daysPending}d vencida
                              </span>
                            )}
                          </div>

                          {/* Fecha */}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(d.createdAt).toLocaleDateString('es-MX', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                            {' · '}
                            hace {d.daysPending} {d.daysPending === 1 ? 'día' : 'días'}
                          </p>

                          {/* Nota de la deuda */}
                          {(d as any).note && (
                            <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600
                                            bg-gray-50 border border-gray-100 rounded-lg
                                            px-2.5 py-2">
                              <span className="shrink-0 mt-0.5">📝</span>
                              <span>{(d as any).note}</span>
                            </div>
                          )}
                        </div>

                        {/* Botón pagado */}
                        <button
                          onClick={() => setPendingPayment(d)}
                          className="shrink-0 flex items-center gap-1.5 text-xs text-white
                                     px-3 py-2 rounded-lg transition-opacity min-h-[36px]"
                          style={{ backgroundColor: color }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Pagado
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

            ) : (
              /* ── Precios especiales ──────────────────────────── */
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-400 mb-3">
                  Precios especiales por producto. Sin precio especial se usa el general.
                </p>

                {(products as any[]).map(p => {
                  const generalPrice = p.pricePerUnit ?? p.generalPrice ?? 0
                  const customPrice  = detail?.customPrices?.find(cp => cp.productId === p.id)
                  const isEditing    = editPrice?.productId === p.id

                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate font-medium">{p.name}</p>
                        <p className="text-xs text-gray-400">
                          ${fmt(generalPrice)}/kg precio general
                        </p>
                      </div>

                      {isEditing ? (
                        /* Modo edición */
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            type="number" step="0.01" min="0.01"
                            className="input-base w-24 text-right text-sm py-1.5"
                            value={editPrice!.value}
                            onChange={e =>
                              setEditPrice({ productId: p.id, value: e.target.value })
                            }
                            onKeyDown={async e => {
                              if (e.key === 'Enter' && editPrice!.value) {
                                await setPrice.mutateAsync({
                                  customerId:  customer.id,
                                  productId:   p.id,
                                  customPrice: Number(editPrice!.value),
                                })
                                setEditPrice(null)
                              }
                              if (e.key === 'Escape') setEditPrice(null)
                            }}
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              if (!editPrice!.value) return
                              await setPrice.mutateAsync({
                                customerId:  customer.id,
                                productId:   p.id,
                                customPrice: Number(editPrice!.value),
                              })
                              setEditPrice(null)
                            }}
                            disabled={!editPrice!.value || setPrice.isPending}
                            className="text-xs text-white px-2.5 py-1.5 rounded-lg
                                       disabled:opacity-40 min-h-[32px]"
                            style={{ backgroundColor: color }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditPrice(null)}
                            className="text-xs text-gray-400 hover:text-gray-600
                                       px-2 py-1.5 border border-gray-200 rounded-lg min-h-[32px]"
                          >
                            ✕
                          </button>
                        </div>

                      ) : customPrice ? (
                        /* Precio especial configurado */
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-sm font-medium" style={{ color }}>
                              ${fmt(customPrice.customPrice)}/kg
                            </span>
                            {generalPrice > 0 && (() => {
                              const diff = (1 - customPrice.customPrice / generalPrice) * 100
                              const abs  = Math.abs(diff).toFixed(0)
                              return diff !== 0 ? (
                                <p
                                  className="text-xs"
                                  style={{ color: diff > 0 ? color : '#f59e0b' }}
                                >
                                  {diff > 0 ? `${abs}% menos` : `${abs}% más`}
                                </p>
                              ) : null
                            })()}
                          </div>

                          <button
                            onClick={() =>
                              setEditPrice({
                                productId: p.id,
                                value:     String(customPrice.customPrice),
                              })
                            }
                            className="flex items-center gap-1 text-xs text-gray-500
                                       border border-gray-200 hover:border-indigo-300
                                       hover:text-indigo-600 px-2.5 py-1.5 rounded-lg
                                       transition-all hover:bg-indigo-50 min-h-[32px]"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            onClick={() =>
                              deletePrice.mutate({ customerId: customer.id, productId: p.id })
                            }
                            disabled={deletePrice.isPending}
                            className="flex items-center gap-1 text-xs text-gray-400
                                       border border-gray-200 hover:border-red-200
                                       hover:text-red-500 px-2.5 py-1.5 rounded-lg
                                       transition-all hover:bg-red-50 min-h-[32px]
                                       disabled:opacity-40"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            </svg>
                            <span className="hidden sm:inline">Quitar</span>
                          </button>
                        </div>

                      ) : (
                        /* Sin precio especial */
                        <button
                          onClick={() => setEditPrice({ productId: p.id, value: '' })}
                          className="shrink-0 flex items-center gap-1.5 text-xs border
                                     px-3 py-2 rounded-lg transition-colors min-h-[36px]"
                          style={{ color, borderColor: `${color}40` }}
                          onMouseEnter={e =>
                            (e.currentTarget.style.backgroundColor = `${color}10`)
                          }
                          onMouseLeave={e =>
                            (e.currentTarget.style.backgroundColor = 'transparent')
                          }
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Precio especial
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

      {/* ── Ticket Modal (ver ticket sin pagar) ───────────────── */}
      {viewingOrderId && (
        <TicketModal
          orderId={viewingOrderId}
          onClose={() => setViewingOrderId(null)}
        />
      )}

      {/* ── Debt Payment Modal ─────────────────────────────────── */}
      {pendingPayment && (
        <DebtPaymentModal
          debt={pendingPayment}
          customer={customer}
          onConfirm={() => markPaid.mutate(pendingPayment.id)}
          onClose={() => setPendingPayment(null)}
        />
      )}
    </>
  )
}