import { useActiveSessions, type ActiveSessionData } from './useActiveSessions'
import { fmt } from '@/lib/fmt'

const money = (n: number) => '$' + fmt(n)

function sessionDuration(openedAt: string): string {
  const ms   = Date.now() - new Date(openedAt).getTime()
  const mins = Math.floor(ms / 60_000)
  const h    = Math.floor(mins / 60)
  const m    = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (mins < 1)  return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  return `hace ${h}h ${mins % 60}m`
}

function CashierCard({ s, lastUpdated }: { s: ActiveSessionData; lastUpdated: Date }) {
  const payTotal = s.totalCash + s.totalCard + s.totalTransfer + s.totalPayLater

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
            {s.cashierName.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{s.cashierName}</p>
          <p className="text-xs text-gray-400">Turno: {sessionDuration(s.openedAt)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">Efectivo en caja</p>
          <p className="font-bold text-gray-800 text-sm">{money(s.currentCash)}</p>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 divide-x divide-gray-50 border-b border-gray-50">
        <div className="px-5 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{s.orderCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">ventas</p>
        </div>
        <div className="px-5 py-3 text-center">
          <p className="text-2xl font-bold text-indigo-600">{money(s.totalSales)}</p>
          <p className="text-xs text-gray-400 mt-0.5">total cobrado</p>
        </div>
      </div>

      {/* Métodos de pago */}
      <div className="px-5 py-3 border-b border-gray-50 space-y-1.5">
        <p className="text-xs font-medium text-gray-500 mb-2">Métodos de pago</p>
        {[
          { label: 'Efectivo',       value: s.totalCash,     color: 'bg-green-400' },
          { label: 'Tarjeta',        value: s.totalCard,     color: 'bg-blue-400'  },
          { label: 'Transferencia',  value: s.totalTransfer, color: 'bg-violet-400'},
          { label: 'A crédito',      value: s.totalPayLater, color: 'bg-amber-400' },
        ].filter(m => m.value > 0).map(m => (
          <div key={m.label} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${m.color}`} />
            <span className="text-xs text-gray-500 flex-1">{m.label}</span>
            <span className="text-xs font-medium text-gray-700">{money(m.value)}</span>
            {payTotal > 0 && (
              <span className="text-xs text-gray-400 w-9 text-right">
                {Math.round((m.value / payTotal) * 100)}%
              </span>
            )}
          </div>
        ))}
        {payTotal === 0 && (
          <p className="text-xs text-gray-400 italic">Sin ventas aún</p>
        )}
        {s.totalDiscounts > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-50 mt-1">
            <span className="w-2 h-2 rounded-full shrink-0 bg-red-300" />
            <span className="text-xs text-gray-400 flex-1">Descuentos aplicados</span>
            <span className="text-xs font-medium text-red-500">-{money(s.totalDiscounts)}</span>
          </div>
        )}
      </div>

      {/* Última venta */}
      <div className="px-5 py-3 flex-1">
        <p className="text-xs font-medium text-gray-500 mb-1">Última venta</p>
        {s.lastSaleAt ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-700 truncate">{s.lastSaleDescription}</p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(s.lastSaleAt)}</p>
            </div>
            <span className="text-sm font-semibold text-gray-800 shrink-0">{money(s.lastSaleAmount)}</span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Sin ventas aún</p>
        )}
      </div>

      {/* Footer con timestamp */}
      <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Actualizado: {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export function MonitorPage() {
  const { data: sessions = [], isLoading, dataUpdatedAt, refetch, isFetching } = useActiveSessions()
  const lastUpdated = new Date(dataUpdatedAt)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Monitor de cajeros</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Se actualiza automáticamente cada 30 segundos
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Estado */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          Cargando...
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-2xl">
            🏪
          </div>
          <p className="text-gray-500 font-medium">No hay cajeros activos en este momento</p>
          <p className="text-gray-400 text-sm mt-1">Cuando alguien abra turno aparecerá aquí</p>
        </div>
      )}

      {/* Tarjetas de cajeros */}
      {!isLoading && sessions.length > 0 && (
        <>
          {/* Resumen global */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Cajeros activos',  value: sessions.length.toString(),              color: 'text-green-600',  bg: 'bg-green-50'  },
              { label: 'Ventas totales',   value: sessions.reduce((s, c) => s + c.orderCount, 0).toString(), color: 'text-gray-700', bg: 'bg-gray-50' },
              { label: 'Total cobrado',    value: money(sessions.reduce((s, c) => s + c.totalSales, 0)),    color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Efectivo en caja', value: money(sessions.reduce((s, c) => s + c.currentCash, 0)),  color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(kpi => (
              <div key={kpi.label} className={`rounded-xl px-4 py-3 ${kpi.bg}`}>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Tarjetas individuales */}
          <div className={`grid gap-4 ${sessions.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {sessions.map(s => (
              <CashierCard key={s.sessionId} s={s} lastUpdated={lastUpdated} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
