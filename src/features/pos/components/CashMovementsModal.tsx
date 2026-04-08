import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { useSessionMovements } from '../hooks/useSessionMovements'
import { useSessionSummary } from '../hooks/useSessionSummary'
import { ReprintModal } from './ReprintModal'
import { fmt } from '@/lib/fmt'
import type { CashMovementDto } from '../types/pos.types'

interface Props { onClose: () => void }

const TYPE_STYLE: Record<CashMovementDto['type'], string> = {
  'Apertura':    'bg-gray-100 text-gray-600',
  'Venta':       'bg-green-100 text-green-700',
  'Venta mixta': 'bg-teal-100 text-teal-700',
  'Anticipo':    'bg-blue-100 text-blue-700',
  'Cobro deuda': 'bg-purple-100 text-purple-700',
  'Gasto':       'bg-red-100 text-red-700',
  'Retiro':      'bg-orange-100 text-orange-700',
}

export function CashMovementsModal({ onClose }: Props) {
  const session = usePosStore(s => s.session)
  const { data: movements, isLoading } = useSessionMovements(session?.id)
  const { data: summary } = useSessionSummary(session?.id)
  const [reprintOrderId, setReprintOrderId] = useState<string | null>(null)

  const currentCash = summary?.expectedCash ?? session?.openingCash ?? 0

  // Build running balance for each row (oldest → newest already sorted by backend)
  const rows = (movements ?? []).map((m, i, arr) => {
    const balance = arr.slice(0, i + 1).reduce((acc, x) => acc + x.amount, 0)
    return { ...m, balance }
  })

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal max-h-[90vh] flex flex-col" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div className="modal-header shrink-0">
          <span className="modal-title">Movimientos de caja</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Current cash banner */}
        <div className="shrink-0 px-4 pb-3 pt-1">
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Efectivo actual en caja</p>
              <p className="text-2xl font-semibold text-gray-900">${fmt(currentCash)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Turno de</p>
              <p className="text-sm font-medium text-gray-700">{session?.cashierName}</p>
            </div>
          </div>
        </div>

        {/* Movement list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 px-4 pb-4">
          {isLoading && (
            <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
          )}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sin movimientos registrados</p>
          )}
          {[...rows].reverse().map((m, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              {/* Time */}
              <span className="text-xs text-gray-400 w-10 shrink-0">{time(m.at)}</span>

              {/* Type badge */}
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_STYLE[m.type as CashMovementDto['type']] ?? 'bg-gray-100 text-gray-600'}`}>
                {m.type}
              </span>

              {/* Description */}
              <span className="flex-1 text-xs text-gray-600 truncate">{m.description}</span>

              {/* Amount + running balance */}
              <div className="text-right shrink-0">
                <p className={`text-sm font-medium ${m.amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {m.amount >= 0 ? '+' : ''}${fmt(Math.abs(m.amount))}
                </p>
                <p className="text-[10px] text-gray-400">${fmt(m.balance)}</p>
              </div>

              {/* Reprint button — only for sales */}
              {m.orderId ? (
                <button
                  onClick={() => setReprintOrderId(m.orderId)}
                  className="shrink-0 text-gray-300 hover:text-indigo-500 transition-colors"
                  title="Reimprimir ticket"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                </button>
              ) : (
                <span className="w-[14px] shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>

    {reprintOrderId && (
      <ReprintModal orderId={reprintOrderId} onClose={() => setReprintOrderId(null)} />
    )}
  </>
  )
}
