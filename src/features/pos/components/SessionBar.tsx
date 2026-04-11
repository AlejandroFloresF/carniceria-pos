import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { CloseSessionModal } from './CloseSessionModal'
import { CashMovementsModal } from './CashMovementsModal'
import { CashWithdrawalModal } from './CashWithdrawalModal'
import { useClientColor } from '../hooks/useClientColor'

export function SessionBar() {
  const { session, saleCount } = usePosStore()
  const [showClose, setShowClose]         = useState(false)
  const [showMovements, setShowMovements] = useState(false)
  const [showWithdraw, setShowWithdraw]   = useState(false)
  const color = useClientColor()
  
  if (!session) return null

  const openedAt = new Date(session.openedAt)
  const elapsed = formatElapsed(openedAt)

  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-1.5 border-b text-xs gap-2 shrink-0"
        style={{ backgroundColor: `${color}08`, borderColor: `${color}25` }}
      >
        {/* Info del turno */}
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: color }} />
          <span className="font-semibold text-gray-700 shrink-0" style={{ color }}>{session.cashierName}</span>
          <span className="text-gray-300 shrink-0">|</span>
          <span className="text-gray-500 shrink-0">
            {openedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-gray-300 shrink-0">·</span>
          <span className="text-gray-500 shrink-0">{elapsed}</span>
          <span className="text-gray-300 shrink-0">·</span>
          <span className="font-medium shrink-0" style={{ color }}>
            {saleCount} {saleCount === 1 ? 'venta' : 'ventas'}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowMovements(true)}
            className="text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-md hover:bg-white/70 transition-colors whitespace-nowrap"
          >
            Movimientos
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            className="text-gray-500 hover:text-orange-600 px-2.5 py-1 rounded-md hover:bg-white/70 transition-colors whitespace-nowrap"
          >
            Retiro
          </button>
          <button
            onClick={() => setShowClose(true)}
            className="text-red-400 hover:text-red-600 px-2.5 py-1 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap font-medium"
          >
            Cerrar turno
          </button>
        </div>
      </div>

      {showMovements && <CashMovementsModal onClose={() => setShowMovements(false)} />}
      {showWithdraw  && <CashWithdrawalModal onClose={() => setShowWithdraw(false)} />}
      {showClose     && <CloseSessionModal onClose={() => setShowClose(false)} />}
    </>
  )
}

function formatElapsed(from: Date): string {
  const mins = Math.floor((Date.now() - from.getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}