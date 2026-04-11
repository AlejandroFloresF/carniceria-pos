import { useState } from 'react'
import { useCreateOrder } from '../hooks/useCreateOrder'
import { usePosStore } from '@/store/posStore'
import { useCustomerDetail } from '../hooks/useCustomerDebts'
import { useFulfillCustomerOrder } from '../hooks/useCustomerOrders'
import { TicketView } from './TicketView'
import type { PaymentMethod, TicketDto } from '../types/pos.types'
import { useClientColor } from '../hooks/useClientColor'
import { fmt } from '@/lib/fmt'

type Method = PaymentMethod | 'PayLater' | 'Split'

const METHODS: { value: Method; label: string; requiresCustomer?: boolean }[] = [
  { value: 'Cash',     label: 'Efectivo' },
  { value: 'Card',     label: 'Tarjeta' },
  { value: 'Transfer', label: 'Transferencia' },
  { value: 'Split',    label: 'Mixto' },
  { value: 'PayLater', label: 'Pagar después', requiresCustomer: true },
]

type SplitSecondary = 'Card' | 'Transfer'

function buildQuickAmounts(total: number): number[] {
  const steps = [50, 100, 200, 500]
  const result = new Set<number>()
  for (const step of steps) {
    result.add(Math.ceil(total / step) * step)
    if (result.size >= 4) break
  }
  return [...result].slice(0, 4)
}

interface Props { onClose: () => void }

export function PaymentModal({ onClose }: Props) {
  const color = useClientColor()
  const [debtNote, setDebtNote]               = useState('')
  const [advancePayment, setAdvance]          = useState('')
  const [advanceMethod, setAdvanceMethod]     = useState<'Cash' | 'Card' | 'Transfer'>('Cash')
  const [splitCash, setSplitCash]             = useState('')
  const [splitSecondary, setSplitSecondary]   = useState<SplitSecondary>('Transfer')
  const total            = usePosStore(s => s.total())
  const selectedCustomer = usePosStore(s => s.selectedCustomer)
  const defaultCustomer  = usePosStore(s => s.defaultCustomer)
  const loadedOrderId    = usePosStore(s => s.loadedOrderId)
  const setLoadedOrder   = usePosStore(s => s.setLoadedOrder)
  const createOrder      = useCreateOrder()
  const fulfillOrder     = useFulfillCustomerOrder()
  const [method, setMethod]           = useState<Method>('Cash')
  const [cashReceived, setCashReceived] = useState('')
  const [ticket, setTicket]           = useState<TicketDto | null>(null)

  // Solo carga deuda si el cliente no es el default (Público General)
  const isRealCustomer = selectedCustomer && selectedCustomer.id !== defaultCustomer?.id
  const { data: customerDetail } = useCustomerDetail(
    isRealCustomer ? selectedCustomer!.id : null
  )

  const received     = parseFloat(cashReceived) || 0
  const advance      = parseFloat(advancePayment) || 0
  const splitCashAmt = parseFloat(splitCash) || 0
  // Redondear a 2 decimales para que coincida con el Total que calcula el backend
  const roundedTotal  = Math.round(total * 100) / 100
  const splitSecondaryAmt = Math.max(0, Math.round((roundedTotal - splitCashAmt) * 100) / 100)
  const debtAmount    = roundedTotal - advance
  const change        = Math.round((received - roundedTotal) * 100) / 100
  const canConfirm    = method === 'PayLater'
    ? !!isRealCustomer && advance < roundedTotal
    : method === 'Split'
      ? splitCashAmt > 0 && splitCashAmt < roundedTotal
      : method !== 'Cash' || received >= roundedTotal
  const quickAmounts = buildQuickAmounts(roundedTotal)

  const pendingDebt = customerDetail?.pendingDebts.reduce((s, d) => s + d.amount, 0) ?? 0

  async function handleConfirm() {
    const res = await createOrder.mutateAsync({
      paymentMethod:           method === 'Split' ? 'Cash' : method as PaymentMethod,
      cashReceived:            method === 'Cash'     ? received
                             : method === 'Split'    ? splitCashAmt
                             : method === 'PayLater' ? advance
                             : roundedTotal,
      debtNote:                method === 'PayLater' ? debtNote : undefined,
      advancePayment:          method === 'PayLater' ? advance : undefined,
      advancePaymentMethod:    method === 'PayLater' && advance > 0 ? advanceMethod : undefined,
      secondaryPaymentMethod:  method === 'Split' ? splitSecondary : undefined,
      secondaryAmount:         method === 'Split' ? splitSecondaryAmt : undefined,
    })

    // If a customer order was loaded into this sale, mark it as fulfilled
    if (loadedOrderId && selectedCustomer) {
      await fulfillOrder.mutateAsync({
        customerId: selectedCustomer.id,
        orderId:    loadedOrderId,
      })
      setLoadedOrder(null)
    }

    setTicket(res.data)
  }

  if (ticket) {
  return (
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()} 
      >
        <TicketView ticket={ticket} onNewSale={onClose} />
      </div>
    </div>
  )
}

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Confirmar pago</span>
          <span className="text-xs text-gray-400">Total: ${fmt(roundedTotal)}</span>
        </div>

        <div className="modal-body">
          {/* Cliente seleccionado */}
          {isRealCustomer && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              <p className="text-xs text-indigo-600 font-medium">{selectedCustomer!.name}</p>
              {selectedCustomer!.discountPercent > 0 && (
                <p className="text-xs text-indigo-400">{selectedCustomer!.discountPercent}% descuento aplicado</p>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total a cobrar</p>
            <p className="text-3xl font-medium text-gray-900">${fmt(roundedTotal)}</p>
          </div>

          {/* Métodos de pago */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map(m => {
                const disabled = m.requiresCustomer && !isRealCustomer
                return (
                  <button
                    key={m.value}
                    disabled={disabled}
                    onClick={() => !disabled && setMethod(m.value)}
                    className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                      method === m.value
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : disabled
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {m.label}
                    {m.requiresCustomer && !isRealCustomer && (
                      <span className="block text-xs font-normal text-gray-300">requiere cliente</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sección de efectivo */}
          {method === 'Cash' && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Cantidad recibida</p>
                <input type="number" className="input-base text-right text-xl"
                  value={cashReceived} placeholder="0.00" autoFocus
                  onChange={e => setCashReceived(e.target.value)} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map(a => (
                  <button key={a} onClick={() => setCashReceived(String(a))}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
                    ${fmt(a)}
                  </button>
                ))}
              </div>
              {cashReceived && (
                <div className={`rounded-lg p-3 text-center border ${
                  change >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-xs mb-0.5 ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {change >= 0 ? 'Cambio a entregar' : 'Monto insuficiente'}
                  </p>
                  <p className={`text-xl font-medium ${change >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {change >= 0
                      ? `$${fmt(change, 0)}`
                      : `$${fmt(Math.abs(received - roundedTotal))} faltantes`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pago mixto */}
          {method === 'Split' && (
            <div className="flex flex-col gap-3">
              {/* Método secundario */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Segundo método</p>
                <div className="flex gap-2">
                  {(['Transfer', 'Card'] as SplitSecondary[]).map(m => (
                    <button key={m} type="button"
                      onClick={() => setSplitSecondary(m)}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                        splitSecondary === m
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {m === 'Transfer' ? 'Transferencia' : 'Tarjeta'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto en efectivo */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Efectivo recibido</p>
                <input type="number" className="input-base text-right text-xl"
                  value={splitCash} placeholder="0.00" autoFocus
                  min={0} max={roundedTotal - 0.01}
                  onChange={e => setSplitCash(e.target.value)} />
              </div>

              {/* Resumen split */}
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                <div className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-gray-500">Efectivo</span>
                  <span className="font-medium text-gray-900">${fmt(splitCashAmt)}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-gray-500">{splitSecondary === 'Transfer' ? 'Transferencia' : 'Tarjeta'}</span>
                  <span className="font-medium text-gray-900">${fmt(splitSecondaryAmt)}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2 text-sm font-medium">
                  <span className="text-gray-700">Total</span>
                  <span className={splitCashAmt > 0 && splitCashAmt < roundedTotal ? 'text-green-700' : 'text-gray-400'}>
                    ${roundedTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {splitCashAmt >= roundedTotal && (
                <p className="text-xs text-red-500 text-center">
                  El efectivo no puede ser igual o mayor al total — usa "Efectivo" directamente
                </p>
              )}
            </div>
          )}

          {/* PayLater info */}
          {method === 'PayLater' && (
            <div className="flex flex-col gap-3">
              {/* Anticipo */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Anticipo recibido <span className="text-gray-400">(opcional)</span>
                </label>
                <input type="number" className="input-base text-right"
                  value={advancePayment} placeholder="0.00"
                  min={0} max={total - 0.01}
                  onChange={e => setAdvance(e.target.value)} />
              </div>

              {/* Método del anticipo — solo si hay anticipo */}
              {advance > 0 && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">¿Cómo pagó el anticipo?</label>
                  <div className="flex gap-2">
                    {(['Cash', 'Card', 'Transfer'] as const).map(m => (
                      <button key={m} type="button"
                        onClick={() => setAdvanceMethod(m)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                          advanceMethod === m
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {m === 'Cash' ? 'Efectivo' : m === 'Card' ? 'Tarjeta' : 'Transferencia'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen deuda */}
              <div className="rounded-lg p-3 border"
                style={{ backgroundColor: `${color}08`, borderColor: `${color}25` }}>
                <p className="text-sm font-medium" style={{ color }}>Resumen de deuda</p>
                <div className="mt-1.5 flex flex-col gap-0.5">
                  <div className="flex justify-between text-xs" style={{ color: `${color}90` }}>
                    <span>Total orden</span><span>${fmt(roundedTotal)}</span>
                  </div>
                  {advance > 0 && (
                    <div className="flex justify-between text-xs text-green-700">
                      <span>Anticipo</span><span>− ${fmt(advance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium pt-1 border-t border-dashed"
                    style={{ color, borderColor: `${color}30` }}>
                    <span>Queda debiendo</span>
                    <span>${fmt(debtAmount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Nota para esta deuda <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  className="input-base"
                  value={debtNote}
                  onChange={e => setDebtNote(e.target.value)}
                  placeholder="Ej. Pedido de fin de semana, paga el lunes..."
                  maxLength={300}
                />
              </div>
            </div>
          )}

          {/* ── Recordatorio de deuda ── */}
          {isRealCustomer && pendingDebt > 0 && (
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-3 flex items-start gap-2">
              <span className="text-orange-500 text-sm mt-0.5">⚠</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-orange-800">
                  {selectedCustomer!.name} tiene saldo pendiente
                </p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Debe <span className="font-medium">${fmt(pendingDebt)}</span>
                  {customerDetail && customerDetail.pendingDebts.length > 0 && (
                    <span> · {customerDetail.pendingDebts.length} orden{customerDetail.pendingDebts.length > 1 ? 'es' : ''} · 
                    más antigua hace {Math.max(...customerDetail.pendingDebts.map(d => d.daysPending))} días</span>
                  )}
                </p>
              </div>
            </div>
          )}

          <button
            className="w-full py-3 px-4 text-white font-medium text-sm rounded-lg
                      disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: color }}
            disabled={!canConfirm || createOrder.isPending}
            onClick={handleConfirm}
          >
            {createOrder.isPending ? 'Procesando...' : 
            method === 'PayLater' ? 'Registrar deuda' : 'Confirmar cobro'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}