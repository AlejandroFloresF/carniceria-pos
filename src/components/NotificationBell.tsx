import { useState, useRef, useEffect } from 'react'
import { useExpenseNotifications } from '@/features/expenses/hooks/useExpenses'
import { useStockShortageAlerts } from '@/features/pos/hooks/useCustomerOrders'
import type { ExpenseNotificationItem } from '@/features/expenses/types/expense.types'

const LS_DISMISSED = 'notif-dismissed-ids'

function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_DISMISSED) ?? '[]')) }
  catch { return new Set() }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(LS_DISMISSED, JSON.stringify([...ids]))
}

interface Props {
  cashierName?: string
  isAdmin?: boolean
  onNavigate: (requestId?: string) => void
  onStockAlert?: () => void
}

const SEVERITY_STYLE: Record<string, string> = {
  info:    'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
}

const SEVERITY_DOT: Record<string, string> = {
  info:    'bg-blue-400',
  warning: 'bg-amber-400',
  danger:  'bg-red-500',
  success: 'bg-green-500',
}

const SEVERITY_LABEL: Record<string, string> = {
  info:    'Info',
  warning: 'Próximo',
  danger:  'Urgente',
  success: 'Aprobado',
}

export function NotificationBell({ cashierName, isAdmin, onNavigate, onStockAlert }: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useExpenseNotifications(cashierName)
  const { data: stockAlerts = [] } = useStockShortageAlerts()

  // Convierte alertas de stock en items de notificación (solo para admin)
  const stockItems: ExpenseNotificationItem[] = isAdmin
    ? stockAlerts.map(a => ({
        type:       'UpcomingExpense' as const,
        title:      `Stock insuficiente — ${a.customerName}`,
        subtitle:   a.shortageItems.map(s => s.productName).join(', '),
        referenceId: `stock-${a.orderId}`,
        severity:   'danger' as const,
      }))
    : []

  // When new data arrives, un-dismiss IDs that are no longer in the list
  // (e.g. a pending request that was approved should stop occupying a dismissed slot)
  useEffect(() => {
    if (!data) return
    const currentIds = new Set(data.items.map(i => i.referenceId ?? '').filter(Boolean))
    setDismissed(prev => {
      const next = new Set([...prev].filter(id => currentIds.has(id)))
      if (next.size !== prev.size) saveDismissed(next)
      return next
    })
  }, [data])

  const allItems = [...stockItems, ...(data?.items ?? [])]
  const visibleItems = allItems.filter(
    item => !item.referenceId || !dismissed.has(item.referenceId)
  )

  const total = visibleItems.length

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleItem(item: ExpenseNotificationItem) {
    setOpen(false)
    if (item.referenceId) {
      const next = new Set(dismissed).add(item.referenceId)
      setDismissed(next)
      saveDismissed(next)
    }
    if (item.referenceId?.startsWith('stock-')) {
      onStockAlert?.()
    } else {
      onNavigate(item.referenceId)
    }
  }

  function clearAll() {
    const ids = new Set(
      (data?.items ?? []).map(i => i.referenceId ?? '').filter(Boolean)
    )
    setDismissed(ids)
    saveDismissed(ids)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Notificaciones"
      >
        {/* Campana con shake cuando hay notificaciones */}
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={total > 0 ? 'animate-bell' : ''}
          style={{ transformOrigin: '50% 0%' }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge con pulse ring cuando hay notificaciones */}
        {total > 0 && (
          <>
            {/* Pulse ring */}
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-400 opacity-60 animate-ping" />
            {/* Badge */}
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center leading-none z-10">
              {total > 99 ? '99+' : total}
            </span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Notificaciones</p>
            {visibleItems.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Limpiar todas
              </button>
            )}
          </div>

          {visibleItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin notificaciones</p>
          ) : (
            <div className="max-h-80 overflow-y-auto overflow-x-hidden divide-y divide-gray-50">
              {visibleItems.map((item, i) => (
                <div key={i} className="flex items-start gap-1 pr-2 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => handleItem(item)}
                    className="flex-1 text-left px-4 py-3 flex items-start gap-3"
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[item.severity]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${SEVERITY_STYLE[item.severity]}`}>
                      {SEVERITY_LABEL[item.severity] ?? item.severity}
                    </span>
                  </button>
                  {item.referenceId && (
                    <button
                      onClick={() => {
                        const next = new Set(dismissed).add(item.referenceId!)
                        setDismissed(next)
                        saveDismissed(next)
                      }}
                      className="mt-3 text-gray-300 hover:text-gray-500 text-xs leading-none px-1"
                      title="Descartar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100">
            <button
              onClick={() => { setOpen(false); onNavigate() }}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Ver todos los gastos →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
