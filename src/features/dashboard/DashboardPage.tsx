import { useEffect, useMemo, useState } from 'react'
import { useDashboard } from '../pos/hooks/useDashboard'
import { usePosStore } from '@/store/posStore'
import { fmt } from '@/lib/fmt'

type RangePreset = 'today' | 'week' | 'month' | 'custom' | 'session'

function getRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString()

  switch (preset) {
    case 'today':
      return { from: new Date(now.setHours(0,0,0,0)).toISOString(), to: fmt(new Date()) }
    case 'week': {
      const w = new Date(); w.setDate(w.getDate() - 7)
      return { from: fmt(w), to: fmt(new Date()) }
    }
    case 'month': {
      const m = new Date(); m.setMonth(m.getMonth() - 1)
      return { from: fmt(m), to: fmt(new Date()) }
    }
    default:
      return { from: new Date(now.setHours(0,0,0,0)).toISOString(), to: fmt(new Date()) }
  }
}

export function DashboardPage() {
  const { session } = usePosStore()
  const [preset, setPreset] = useState<RangePreset>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [useSession, setUseSession] = useState(false)

  const [range, setRange] = useState(() => getRange('today'))

  // Mantiene el mismo rango mientras el usuario no cambie el preset / custom
  useEffect(() => {
    if (preset === 'custom') {
      setRange({ from: customFrom, to: customTo })
    } else {
      setRange(getRange(preset))
    }
  }, [preset, customFrom, customTo])

  const filters = useMemo(
    () => ({
      ...range,
      sessionId: useSession && session ? session.id : undefined,
    }),
    [range.from, range.to, useSession, session?.id]
  )

  const { data, isLoading } = useDashboard(filters)

  const presets: { value: RangePreset; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: '7 días' },
    { value: 'month', label: '30 días' },
    { value: 'custom', label: 'Personalizado' },
  ]

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto">

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {presets.map(p => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`text-sm px-4 py-2 rounded-lg border transition-all ${
                preset === p.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="input-base !w-auto"
              value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" className="input-base !w-auto"
              value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}

        {session && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={useSession}
              onChange={e => setUseSession(e.target.checked)}
              className="rounded" />
            Solo turno actual
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Cargando datos...</div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Ventas totales',   value: `$${fmt(data.totalSales)}`,    sub: `${data.totalOrders} tickets`, color: 'text-gray-900' },
              { label: 'Ticket promedio',  value: `$${fmt(data.averageTicket)}`, sub: 'por venta', color: 'text-gray-900' },
              { label: 'Descuentos',       value: `$${fmt(data.totalDiscounts)}`,sub: 'aplicados', color: 'text-red-600' },
              {
                label: 'vs período anterior',
                value: `${data.comparison.changePercent > 0 ? '+' : ''}${data.comparison.changePercent}%`,
                sub: `anterior: $${fmt(data.comparison.previousTotal)}`,
                color: data.comparison.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              },
            ].map(k => (
              <div key={k.label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                <p className={`text-2xl font-medium ${k.color}`}>{k.value}</p>
                <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Método de pago */}
          <div className="card p-5">
            <p className="text-sm font-medium text-gray-700 mb-4">Desglose por método de pago</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const d = data as any
                const items = [
                  { label: 'Efectivo',      value: data.totalCash,            color: '#10b981' },
                  { label: 'Tarjeta',       value: data.totalCard,            color: '#6366f1' },
                  { label: 'Transferencia', value: data.totalTransfer,        color: '#0ea5e9' },
                  { label: 'A crédito',     value: d.totalCreditSales ?? 0,   color: '#f59e0b' },
                ]
                const base = items.reduce((s, m) => s + m.value, 0)
                return items.map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-lg font-medium text-gray-900">${fmt(m.value)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: base > 0 ? `${(m.value / base * 100).toFixed(0)}%` : '0%', backgroundColor: m.color }} />
                    </div>
                  </div>
                ))
              })()}
            </div>
            {(() => {
              const d = data as any
              const debtPay = d.totalDebtPayments ?? 0
              return debtPay > 0 ? (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Cobros de deuda recibidos</span>
                  <span className="text-sm font-medium text-purple-700">${fmt(debtPay)}</span>
                </div>
              ) : null
            })()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productos más vendidos */}
            <div className="card p-5">
              <p className="text-sm font-medium text-gray-700 mb-4">Productos más vendidos</p>
              <div className="flex flex-col gap-2">
                {data.topProducts.slice(0, 8).map((p, i) => (
                  <div key={p.productName} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-800 font-medium">{p.productName}</span>
                        <span className="text-gray-900">${fmt(p.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{p.totalKg} kg vendidos</span>
                        <span>{p.orderCount} órdenes</span>
                      </div>
                      <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-300 rounded-full"
                          style={{ width: `${(p.totalRevenue / data.topProducts[0].totalRevenue * 100).toFixed(0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clientes frecuentes */}
            <div className="card p-5">
              <p className="text-sm font-medium text-gray-700 mb-4">Clientes frecuentes</p>
              {data.topCustomers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Aún no hay ventas con cliente asignado en este período
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.topCustomers.map((c, i) => (
                    <div key={c.customerName} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-800">{c.customerName}</span>
                          <span className="text-gray-900">${fmt(c.totalSpent)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                          <span>{c.orderCount} compras</span>
                          <span>Última: {new Date(c.lastPurchase).toLocaleDateString('es-MX')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ventas por día */}
            <div className="card p-5">
              <p className="text-sm font-medium text-gray-700 mb-4">Ventas por día</p>
              {data.salesByDay.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin ventas en este período</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Barras */}
                  <div className="flex items-end gap-1" style={{ height: '160px' }}>
                    {data.salesByDay.map(d => {
                      const max = Math.max(...data.salesByDay.map(x => x.total))
                      const pct = max > 0 ? (d.total / max) * 100 : 0
                      const barHeight = Math.max(4, (pct / 100) * 140)
                      const date = new Date(d.date)
                      const isWeekend = date.getDay() === 5 || date.getDay() === 6

                      return (
                        <div
                          key={d.date}
                          className="flex-1 flex flex-col items-center justify-end gap-1 group relative"
                          style={{ height: '160px' }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                                          bg-gray-900 text-white text-xs rounded px-2 py-1 
                                          whitespace-nowrap opacity-0 group-hover:opacity-100 
                                          transition-opacity pointer-events-none z-10">
                            ${fmt(d.total, 0)} · {d.orderCount} ventas
                          </div>

                          {/* Barra */}
                          <div
                            className={`w-full rounded-t transition-all ${
                              isWeekend ? 'bg-indigo-500' : 'bg-indigo-300'
                            } hover:opacity-80`}
                            style={{ height: `${barHeight}px` }}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Etiquetas de fecha — solo muestra algunas para no saturar */}
                  <div className="flex items-start gap-1 overflow-hidden">
                    {data.salesByDay.map((d, idx) => {
                      const total = data.salesByDay.length
                      // Muestra la etiqueta cada N días según cuántos haya
                      const step = total <= 7 ? 1 : total <= 14 ? 2 : total <= 21 ? 3 : 5
                      const show = idx % step === 0 || idx === total - 1

                      return (
                        <div key={d.date} className="flex-1 flex justify-center">
                          {show ? (
                            <span className="text-xs text-gray-400 whitespace-nowrap"
                              style={{ fontSize: '10px' }}>
                              {new Date(d.date).toLocaleDateString('es-MX', {
                                day: '2-digit', month: 'short'
                              })}
                            </span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  {/* Leyenda */}
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                      <span className="text-xs text-gray-400">Fin de semana</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-indigo-300" />
                      <span className="text-xs text-gray-400">Entre semana</span>
                    </div>
                    <div className="ml-auto text-xs text-gray-400">
                      Máximo: ${fmt(Math.max(...data.salesByDay.map(x => x.total)), 0)}
                    </div>
                  </div>
                </div>
              )}
            </div>
        </>
      ) : null}
    </div>
  )
}