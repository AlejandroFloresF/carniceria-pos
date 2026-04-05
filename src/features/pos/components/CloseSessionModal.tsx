import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { useCloseSession } from '../hooks/useCloseSession'
import { useSessionSummary } from '../hooks/useSessionSummary'
import { fmt } from '@/lib/fmt'

interface Props { onClose: () => void }

export function CloseSessionModal({ onClose }: Props) {
  const { session, closeSession } = usePosStore()
  const [closingCash, setClosingCash] = useState('')
  const closeSessionMutation = useCloseSession()
  const { data: summary } = useSessionSummary(session?.id)
  const expectedCash = summary?.expectedCash ?? (session?.openingCash ?? 0)
  const effectiveCash = closingCash === '' ? 0 : parseFloat(closingCash) || 0
  const diff          = effectiveCash - expectedCash


  async function handleClose() {
  const cash = closingCash === '' ? 0 : parseFloat(closingCash) || 0
  try {
    await closeSessionMutation.mutateAsync({
      sessionId:   session!.id,
      closingCash: cash,
    })
  } catch (err: any) {
    const status = err?.response?.status
    if (status !== 400 && status !== 404) return
  } finally {
    closeSession()
    sessionStorage.removeItem('pos-store')
    onClose()
  }
}


  return (
    <div className="modal-overlay">
      <div className="modal max-h-[90vh] overflow-y-auto">
        <div className="modal-header">
          <span className="modal-title">Cerrar turno</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="modal-body">
          {summary && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Ventas totales',    value: `$${fmt(summary.totalSales)}`,                        sub: `${summary.totalOrders} tickets` },
                  { label: 'Efectivo en caja',  value: `$${fmt(summary.totalCash)}`,                         sub: 'ventas + anticipos + cobros' },
                  { label: 'Tarjeta / transf.', value: `$${fmt(summary.totalCard + summary.totalTransfer)}`, sub: '' },
                  { label: 'Descuentos',        value: `$${fmt(summary.totalDiscounts)}`,                    sub: '' },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{m.label}</p>
                    <p className="text-lg font-medium text-gray-900">{m.value}</p>
                    {m.sub && <p className="text-xs text-gray-400">{m.sub}</p>}
                  </div>
                ))}
              </div>
              {summary.totalDebtPayments > 0 && (
                <div className="flex items-center justify-between text-sm bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                  <span className="text-purple-700">Cobros de deuda recibidos</span>
                  <span className="font-medium text-purple-800">${fmt(summary.totalDebtPayments)}</span>
                </div>
              )}
              {summary.totalExpenses > 0 && (
                <div className="flex items-center justify-between text-sm bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                  <span className="text-orange-700">Gastos aprobados (salida de caja)</span>
                  <span className="font-medium text-orange-800">− ${fmt(summary.totalExpenses)}</span>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Efectivo contado en caja</label>
            <input
              className="input-base"
              type="number"
              step={0.01}
              min={0}
              placeholder={`${fmt(expectedCash)}`}
              value={closingCash}
              onFocus={e => e.target.select()}
              onChange={e => setClosingCash(e.target.value)}
            />
          </div>

          <div className={`rounded-lg p-3 border flex justify-between text-sm ${
            diff === 0 ? 'bg-green-50 border-green-200' : diff > 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
          }`}>
            <span className="text-gray-600">Diferencia vs esperado (${fmt(expectedCash)})</span>
            <span className={`font-medium ${diff === 0 ? 'text-green-700' : diff > 0 ? 'text-amber-700' : 'text-red-700'}`}>
              {diff === 0 ? 'Cuadrado' : `${diff > 0 ? '+' : ''}$${fmt(diff)}`}
            </span>
          </div>

          <button
            className="btn-primary"
            disabled={closeSessionMutation.isPending}
            onClick={handleClose}
          >
            {closeSessionMutation.isPending ? 'Cerrando...' : 'Cerrar turno y guardar'}
          </button>

          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}