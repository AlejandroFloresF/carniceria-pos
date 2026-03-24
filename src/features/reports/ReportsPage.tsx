import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePosStore } from '@/store/posStore'
import { useDashboard } from '../pos/hooks/useDashboard'
import { api } from '@/lib/api'

type RangePreset = 'today' | 'week' | 'month' | 'custom'

interface SaleRecord {
  folio:          string
  createdAt:      string
  customerName:   string
  paymentMethod:  string
  total:          number
  discountAmount: number
  cashierName:    string
}

const METHOD_LABELS: Record<string, string> = {
  Cash: 'Efectivo', Card: 'Tarjeta',
  Transfer: 'Transferencia', PayLater: 'A crédito',
}

export function ReportsPage() {
  const { session }                     = usePosStore()
  const [preset, setPreset]             = useState<RangePreset>('today')
  const [customFrom, setCustomFrom]     = useState('')
  const [customTo, setCustomTo]         = useState('')
  const [useSession, setUseSession]     = useState(false)
  const [exporting, setExporting]       = useState(false)

  // ← useMemo evita que filters se recree en cada render
  const filters = useMemo(() => {
    const now = new Date()
    const bod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

    let from: Date
    let to: Date = now

    switch (preset) {
      case 'today':
        from = bod(new Date())
        break
      case 'week': {
        const w = new Date()
        w.setDate(w.getDate() - 7)
        from = bod(w)
        break
      }
      case 'month': {
        const m = new Date()
        m.setMonth(m.getMonth() - 1)
        from = bod(m)
        break
      }
      case 'custom':
        from = customFrom
          ? new Date(customFrom)
          : bod(new Date())
        to = customTo
          ? new Date(customTo + 'T23:59:59')
          : now
        break
      default:
        from = bod(new Date())
    }

    return {
      from:      from.toISOString(),
      to:        to.toISOString(),
      sessionId: useSession && session ? session.id : undefined,
    }
  // ← solo recalcula cuando cambian estos valores
  }, [preset, customFrom, customTo, useSession, session?.id])

  const { data: dashboard } = useDashboard(filters)

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-list', filters.from, filters.to, filters.sessionId],
    queryFn: async () => {
      const { data } = await api.get<SaleRecord[]>('/orders/list', {
        params: {
          from:      filters.from,
          to:        filters.to,
          sessionId: filters.sessionId,
        },
      })
      return data
    },
    // ← evita refetch automático
    staleTime:          60_000,
    refetchOnWindowFocus: false,
  })

  // ── Exportar CSV ──────────────────────────────────────────────────────────
  function exportCSV() {
    setExporting(true)
    const headers = ['Folio', 'Fecha', 'Cliente', 'Cajero', 'Método', 'Descuento', 'Total']
    const rows    = sales.map(s => [
    `#${s.folio}`,
    new Date(s.createdAt).toLocaleString('es-MX'),
    s.customerName,
    s.cashierName,  
    METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod,
    `$${s.discountAmount.toFixed(2)}`,
    `$${s.total.toFixed(2)}`,
    ])

    const csv  = [headers, ...rows]
      .map(r => r.map(v => `"${v}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `ventas_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const PRESETS: { value: RangePreset; label: string }[] = [
    { value: 'today',  label: 'Hoy'          },
    { value: 'week',   label: '7 días'        },
    { value: 'month',  label: '30 días'       },
    { value: 'custom', label: 'Personalizado' },
  ]

  const totalSalesSum    = sales.reduce((s, r) => s + r.total, 0)
  const totalDiscountSum = sales.reduce((s, r) => s + r.discountAmount, 0)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-5" id="report-printable">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Cierre de caja</h1>
          <p className="text-sm text-gray-500">Reporte de ventas y exportación</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={exporting || sales.length === 0}
            className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white
                       hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg
                       disabled:opacity-40 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={sales.length === 0}
            className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white
                       hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg
                       disabled:opacity-40 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                preset === p.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" className="input-base !w-auto text-sm"
              value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" className="input-base !w-auto text-sm"
              value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}

        {session && (
          <label className="flex items-center gap-2 text-sm text-gray-600
                            cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={useSession}
              onChange={e => setUseSession(e.target.checked)}
              className="rounded"
            />
            Solo turno actual
          </label>
        )}
      </div>

      {/* KPIs del dashboard */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total ventas',
              value: `$${dashboard.totalSales.toFixed(2)}`,
              sub:   `${dashboard.totalOrders} tickets`,
            },
            {
              label: 'Ticket promedio',
              value: `$${dashboard.averageTicket.toFixed(2)}`,
              sub:   'por venta',
            },
            {
              label: 'Efectivo en caja',
              value: `$${dashboard.totalCash.toFixed(2)}`,
              sub:   'cobrado hoy',
            },
            {
              label: 'Descuentos',
              value: `$${dashboard.totalDiscounts.toFixed(2)}`,
              sub:   'aplicados',
            },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-lg font-medium text-gray-900 mt-0.5">{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Desglose métodos de pago */}
      {dashboard && dashboard.totalSales > 0 && (
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Métodos de pago</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Efectivo',      value: dashboard.totalCash,     color: '#10b981' },
              { label: 'Tarjeta',       value: dashboard.totalCard,     color: '#6366f1' },
              { label: 'Transferencia', value: dashboard.totalTransfer, color: '#0ea5e9' },
              { label: 'A crédito',     value: (dashboard as any).totalCreditSales ?? 0, color: '#f59e0b' },
            ].map(m => {
              const pct = dashboard.totalSales > 0
                ? (m.value / dashboard.totalSales * 100)
                : 0
              return (
                <div key={m.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-gray-500">{m.label}</span>
                    <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    ${m.value.toFixed(2)}
                  </p>
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct.toFixed(0)}%`, backgroundColor: m.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabla de ventas */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">
            Ventas ({sales.length})
          </p>
          {isLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Cargando...</span>
          )}
        </div>

        {!isLoading && sales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Sin ventas en este período
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '500px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Folio
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Hora
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Cajero
                    </th>
                  <th className="text-center px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Método
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Descuento
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sales.map(s => (
                  <tr key={s.folio} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                      #{s.folio}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">
                      {new Date(s.createdAt).toLocaleTimeString('es-MX', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 max-w-[140px] truncate">
                      {s.customerName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-sm">
                    {s.cashierName}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.paymentMethod === 'Cash'
                          ? 'bg-green-100 text-green-700'
                          : s.paymentMethod === 'Card'
                            ? 'bg-indigo-100 text-indigo-700'
                            : s.paymentMethod === 'Transfer'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-amber-100 text-amber-700'
                      }`}>
                        {METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-red-500">
                      {s.discountAmount > 0
                        ? `-$${s.discountAmount.toFixed(2)}`
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                      ${s.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-700">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-red-500">
                    {totalDiscountSum > 0 ? `-$${totalDiscountSum.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    ${totalSalesSum.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}