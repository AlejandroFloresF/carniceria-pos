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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 bg-white border-b border-gray-100 text-sm gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span className="font-medium text-gray-900 truncate">{session.cashierName}</span>
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500 truncate">
            Turno desde {openedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500 truncate">{elapsed}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500 truncate">{saleCount} {saleCount === 1 ? 'venta' : 'ventas'}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMovements(true)}
            className="text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 px-3 py-1 rounded-lg transition-colors whitespace-nowrap"
          >
            Movimientos
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            className="text-xs text-gray-500 hover:text-orange-600 border border-gray-200 px-3 py-1 rounded-lg transition-colors whitespace-nowrap"
          >
            Retiro
          </button>
          <button
            onClick={() => setShowClose(true)}
            className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-1 rounded-lg transition-colors whitespace-nowrap"
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