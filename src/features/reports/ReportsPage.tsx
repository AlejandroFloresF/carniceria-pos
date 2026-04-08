import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePosStore } from '@/store/posStore'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'
import { FilterPill } from '@/components/FilterPill'
import { useExpenseRequests } from '@/features/expenses/hooks/useExpenses'
import { ReprintModal } from '@/features/pos/components/ReprintModal'
import type { Customer } from '../pos/types/pos.types'
import { fmt } from '@/lib/fmt'

const LS_CUSTOMER = 'reports-filter-customer'
const LS_CASHIER  = 'reports-filter-cashier'

type RangePreset = 'today' | 'week' | 'month' | 'custom'

interface SaleRecord {
  folio:               string
  createdAt:           string
  customerName:        string
  paymentMethod:       string
  total:               number
  discountAmount:      number
  cashierName:         string
  isDebtPayment:       boolean
  advancePayment:      number
  pendingDebt:         number
  isFromCustomerOrder: boolean
  orderId:             string | null
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
  const [tableSearch, setTableSearch]   = useState('')
  const [customerFilter, setCustomerFilter] = useState<string>(
    () => localStorage.getItem(LS_CUSTOMER) ?? ''
  )
  const [cashierFilter, setCashierFilter] = useState<string>(
    () => localStorage.getItem(LS_CASHIER) ?? ''
  )

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data } = await api.get<Customer[]>('/customers')
      return data
    },
    staleTime: 60_000,
  })

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

  const { data: approvedExpenses = [] } = useExpenseRequests('Approved', undefined, filters.from, filters.to)

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

  // ── Exportar Excel ──────────────────────────────────────────────────────────
  function exportExcel() {
    setExporting(true)
    type Row = { Folio: string; Fecha: string; Cliente: string; Cajero: string; Tipo: string; Método: string; Descuento: number | string; Total: number | string; Anticipo: number | string; Pendiente: number | string }
    const data: Row[] = display.map(s => ({
      Folio:     `#${s.folio}`,
      Fecha:     new Date(s.createdAt).toLocaleString('es-MX'),
      Cliente:   s.customerName,
      Cajero:    s.cashierName,
      Tipo:      s.isDebtPayment ? 'Cobro deuda' : s.isFromCustomerOrder ? 'Venta pedido' : 'Venta',
      Método:    METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod,
      Descuento: s.discountAmount,
      Total:     s.total,
      Anticipo:  s.advancePayment > 0 ? s.advancePayment : '',
      Pendiente: s.pendingDebt    > 0 ? s.pendingDebt    : '',
    }))

    data.push({ Folio: '', Fecha: '', Cliente: '', Cajero: '', Tipo: '', Método: '', Descuento: '', Total: '', Anticipo: '', Pendiente: '' })
    data.push({ Folio: 'TOTAL', Fecha: '', Cliente: '', Cajero: '', Tipo: `${display.length} registros`, Método: '', Descuento: totalDiscountSum, Total: totalSalesSum, Anticipo: '', Pendiente: '' })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    const suffixCustomer = customerFilter ? `_${customerFilter.replace(/\s+/g, '_')}` : ''
    const suffixCashier  = cashierFilter  ? `_${cashierFilter.replace(/\s+/g, '_')}`  : ''
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
    XLSX.writeFile(wb, `ventas${suffixCustomer}${suffixCashier}_${new Date().toISOString().split('T')[0]}.xlsx`)
    setExporting(false)
  }

  const PRESETS: { value: RangePreset; label: string }[] = [
    { value: 'today',  label: 'Hoy'          },
    { value: 'week',   label: '7 días'        },
    { value: 'month',  label: '30 días'       },
    { value: 'custom', label: 'Personalizado' },
  ]

  const { display, stats } = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()

    const display = sales
      .filter(s => !customerFilter || s.customerName === customerFilter)
      .filter(s => !cashierFilter  || s.cashierName  === cashierFilter)
      .filter(s => !q ||
        s.folio.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q)
      )

    const realSales    = display.filter(s => !s.isDebtPayment)
    const debtPayRecs  = display.filter(s =>  s.isDebtPayment)

    const totalSales        = realSales.reduce((a, r) => a + r.total, 0)
    const totalOrders       = realSales.length
    const averageTicket     = totalOrders > 0 ? totalSales / totalOrders : 0
    const totalDiscounts    = realSales.reduce((a, r) => a + r.discountAmount, 0)
    const totalCash         = realSales.filter(s => s.paymentMethod === 'Cash').reduce((a, r) => a + r.total, 0)
                            + realSales.reduce((a, r) => a + r.advancePayment, 0)
                            + debtPayRecs.reduce((a, r) => a + r.total, 0)
    const totalCard         = realSales.filter(s => s.paymentMethod === 'Card').reduce((a, r) => a + r.total, 0)
    const totalTransfer     = realSales.filter(s => s.paymentMethod === 'Transfer').reduce((a, r) => a + r.total, 0)
    const totalCreditSales  = realSales.filter(s => s.paymentMethod === 'PayLater').reduce((a, r) => a + r.total, 0)
    const totalDebtPayments = debtPayRecs.reduce((a, r) => a + r.total, 0)

    return {
      display,
      stats: { totalSales, totalOrders, averageTicket, totalDiscounts, totalCash, totalCard, totalTransfer, totalCreditSales, totalDebtPayments },
    }
  }, [sales, customerFilter, cashierFilter, tableSearch])

  const totalSalesSum    = stats.totalSales
  const totalDiscountSum = stats.totalDiscounts

  const [reprintOrderId, setReprintOrderId] = useState<string | null>(null)

  function handleCustomerFilter(name: string) {
    setCustomerFilter(name)
    if (name) localStorage.setItem(LS_CUSTOMER, name)
    else      localStorage.removeItem(LS_CUSTOMER)
  }

  function handleCashierFilter(name: string) {
    setCashierFilter(name)
    if (name) localStorage.setItem(LS_CASHIER, name)
    else      localStorage.removeItem(LS_CASHIER)
  }

  // Cajeros únicos presentes en los datos cargados
  const cashierOptions = useMemo(() =>
    [...new Set(sales.map(s => s.cashierName))]
      .filter(Boolean)
      .sort()
      .map(n => ({ value: n, label: n }))
  , [sales])

  const customerOptions = useMemo(() =>
    customers
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({ value: c.name, label: c.name }))
  , [customers])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-5" id="report-printable">
      {reprintOrderId && (
        <ReprintModal orderId={reprintOrderId} onClose={() => setReprintOrderId(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Cierre de caja</h1>
          <p className="text-sm text-gray-500">Reporte de ventas y exportación</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            disabled={exporting || display.length === 0}
            className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white
                       hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg
                       disabled:opacity-40 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Excel
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

        {/* Filtros cliente y cajero */}
        <FilterPill
          placeholder="Todos los clientes"
          options={customerOptions}
          value={customerFilter}
          onChange={handleCustomerFilter}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <FilterPill
          placeholder="Todos los cajeros"
          options={cashierOptions}
          value={cashierFilter}
          onChange={handleCashierFilter}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />

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

      {/* KPIs */}
      {!isLoading && display.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total ventas',
              value: `$${fmt(stats.totalSales)}`,
              sub:   `${stats.totalOrders} tickets`,
            },
            {
              label: 'Ticket promedio',
              value: `$${fmt(stats.averageTicket)}`,
              sub:   'por venta',
            },
            {
              label: 'Efectivo en caja',
              value: `$${fmt(stats.totalCash)}`,
              sub:   'ventas + anticipos + cobros',
            },
            {
              label: 'Descuentos',
              value: `$${fmt(stats.totalDiscounts)}`,
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
      {!isLoading && stats.totalSales > 0 && (
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Métodos de pago</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Efectivo',      value: stats.totalCash,         color: '#10b981' },
              { label: 'Tarjeta',       value: stats.totalCard,         color: '#6366f1' },
              { label: 'Transferencia', value: stats.totalTransfer,     color: '#0ea5e9' },
              { label: 'A crédito',     value: stats.totalCreditSales,  color: '#f59e0b' },
              { label: 'Cobros deuda',  value: stats.totalDebtPayments, color: '#8b5cf6' },
            ].map(m => {
              const base = stats.totalCash + stats.totalCard + stats.totalTransfer + stats.totalCreditSales
              const pct = base > 0 ? (m.value / base * 100) : 0
              return (
                <div key={m.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-gray-500">{m.label}</span>
                    <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    ${fmt(m.value)}
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700 shrink-0">
            Movimientos ({display.length}
            {customerFilter ? ` · ${customerFilter}` : ''}
            {cashierFilter  ? ` · ${cashierFilter}`  : ''})
          </p>
          <div className="flex items-center gap-2 sm:ml-auto">
            <input
              className="input-base !py-1.5 text-sm w-48"
              placeholder="Buscar folio, cliente, cajero…"
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
            />
            {isLoading && (
              <span className="text-xs text-gray-400 animate-pulse shrink-0">Cargando...</span>
            )}
          </div>
        </div>

        {!isLoading && display.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            {tableSearch.trim() ? 'Sin resultados para la búsqueda' : 'Sin ventas en este período'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '500px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Folio</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Hora</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Cajero</th>
                  <th className="text-center px-4 py-2.5 text-xs text-gray-500 font-medium">Tipo</th>
                  <th className="text-center px-4 py-2.5 text-xs text-gray-500 font-medium">Método</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Descuento</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Total</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {display.map((s, i) => (
                  <tr key={`${s.folio}-${i}`}
                    className={`transition-colors ${s.isDebtPayment ? 'bg-purple-50/40 hover:bg-purple-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">#{s.folio}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">
                      {new Date(s.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 max-w-[140px] truncate">{s.customerName}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-sm">{s.cashierName}</td>
                    <td className="px-4 py-2.5 text-center">
                      {s.isDebtPayment ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Cobro deuda
                        </span>
                      ) : s.isFromCustomerOrder ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                          Pedido
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          Venta
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.paymentMethod === 'Cash'     ? 'bg-green-100 text-green-700'
                        : s.paymentMethod === 'Card'   ? 'bg-indigo-100 text-indigo-700'
                        : s.paymentMethod === 'Transfer' ? 'bg-sky-100 text-sky-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-red-500">
                      {s.discountAmount > 0 ? `-$${fmt(s.discountAmount)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                      <div>${fmt(s.total)}</div>
                      {s.paymentMethod === 'PayLater' && s.advancePayment > 0 && (
                        <div className="text-xs text-green-600">+${fmt(s.advancePayment)} anticipo</div>
                      )}
                      {s.paymentMethod === 'PayLater' && s.pendingDebt > 0 && (
                        <div className="text-xs text-red-500">${fmt(s.pendingDebt)} pendiente</div>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      {s.orderId && (
                        <button
                          onClick={() => setReprintOrderId(s.orderId!)}
                          title="Reimprimir ticket"
                          className="text-gray-300 hover:text-indigo-500 transition-colors p-1 rounded">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={6} className="px-4 py-3 text-sm font-medium text-gray-700">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-red-500">
                    {totalDiscountSum > 0 ? `-$${fmt(totalDiscountSum)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    ${fmt(totalSalesSum)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Egresos del período */}
      {approvedExpenses.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">
              Egresos aprobados ({approvedExpenses.length})
            </p>
            <span className="text-sm font-medium text-red-600">
              -${fmt(approvedExpenses.reduce((s, e) => s + e.amount, 0))}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '400px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Descripción</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Categoría</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Cajero</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Aprobado por</th>
                  <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Fecha</th>
                  <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {approvedExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900">{e.description}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{e.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{e.requestedBy}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{e.reviewedBy ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {new Date(e.requestedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">-${fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-700">Total egresos</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                    -${fmt(approvedExpenses.reduce((s, e) => s + e.amount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}