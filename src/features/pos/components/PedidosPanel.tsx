import { useQueryClient } from '@tanstack/react-query'
import { useTodayOrders } from '../hooks/useCustomerOrders'
import { usePosStore } from '@/store/posStore'
import { api } from '@/lib/api'
import type { CustomerOrder, ProductWithPrice } from '../types/pos.types'

const RECURRENCE_SHORT: Record<string, string> = {
  None:      'Una vez',
  Weekly:    'Semanal',
  Biweekly:  'Quincenal',
  Monthly:   'Mensual',
  Bimonthly: 'Bimestral',
  Annual:    'Anual',
}

interface Props {
  onOrderLoaded?: () => void   // callback for mobile: switch to cart tab
}

export function PedidosPanel({ onOrderLoaded }: Props) {
  const { data: orders = [], isLoading, refetch } = useTodayOrders()
  const { addItem, setCustomer, setLoadedOrder, loadedOrderId, resetCart } = usePosStore()
  const qc = useQueryClient()

  async function loadOrder(order: CustomerOrder) {
    // 1. Load products with customer pricing
    let products: ProductWithPrice[] = []
    try {
      const { data } = await api.get<ProductWithPrice[]>(
        `/products/with-prices/${order.customerId}`
      )
      products = data
    } catch {
      const { data } = await api.get<ProductWithPrice[]>('/products')
      products = data as ProductWithPrice[]
    }

    const productMap = Object.fromEntries(products.map(p => [p.id, p]))

    // 2. Reset cart and set customer
    resetCart()

    // We don't have the full Customer object here, build a minimal one
    setCustomer({
      id:              order.customerId,
      name:            order.customerName,
      discountPercent: 0,
      totalDebt:       0,
      color:           '#6366f1',
    })

    // 3. Add each order item to the cart
    for (const item of order.items) {
      const product = productMap[item.productId]
      if (product) {
        addItem(product, item.quantityKg)
      }
    }

    // 4. Store which order is loaded
    setLoadedOrder(order.id)

    // 5. Invalidate products so POS shows the right prices
    qc.invalidateQueries({ queryKey: ['products'] })

    onOrderLoaded?.()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isLoading) {
    return (
      <div className="p-3 text-xs text-gray-400 text-center py-8">
        Cargando pedidos...
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
        <span className="text-2xl">📋</span>
        <p className="text-xs text-gray-500">Sin pedidos para hoy</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-indigo-500 hover:text-indigo-700 mt-1">
          Actualizar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {orders.map(order => {
        const deliveryDate = new Date(order.nextDeliveryDate)
        deliveryDate.setHours(0, 0, 0, 0)
        const daysOverdue = Math.floor(
          (today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const isLoaded = loadedOrderId === order.id

        return (
          <div
            key={order.id}
            className="rounded-xl border p-3 flex flex-col gap-2 transition-all"
            style={{
              borderColor: isLoaded
                ? '#6366f1'
                : order.hasStockShortage
                  ? '#fca5a5'
                  : '#e5e7eb',
              backgroundColor: isLoaded
                ? '#eef2ff'
                : order.hasStockShortage
                  ? '#fff5f5'
                  : '#fafafa',
            }}
          >
            {/* Customer name + badges */}
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-medium text-gray-900 leading-tight truncate">
                {order.customerName}
              </p>
              <div className="flex gap-1 shrink-0">
                {order.hasStockShortage && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    ⚠ Stock
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {RECURRENCE_SHORT[order.recurrence] ?? order.recurrence}
                </span>
              </div>
            </div>

            {/* Date */}
            {daysOverdue > 0 ? (
              <p className="text-[11px] text-red-600 font-medium">
                Vencido hace {daysOverdue} {daysOverdue === 1 ? 'día' : 'días'}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">
                {deliveryDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
              </p>
            )}

            {/* Items */}
            <div className="flex flex-col gap-0.5">
              {order.items.map(item => (
                <div key={item.productId} className="flex justify-between text-[11px]">
                  <span className="text-gray-600 truncate">{item.productName}</span>
                  <span className="text-gray-500 shrink-0 ml-1">{item.quantityKg} kg</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {order.notes && (
              <p className="text-[11px] text-gray-400 italic truncate">📝 {order.notes}</p>
            )}

            {/* Load button */}
            {order.hasStockShortage ? (
              <div className="rounded-lg bg-red-50 border border-red-100 px-2 py-1.5 text-center">
                <p className="text-[11px] font-medium text-red-700">No se puede cargar</p>
                <p className="text-[10px] text-red-400 mt-0.5">Stock insuficiente para este pedido</p>
              </div>
            ) : (
              <button
                onClick={() => loadOrder(order)}
                className={`w-full text-xs py-1.5 rounded-lg font-medium transition-all ${
                  isLoaded
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {isLoaded ? '✓ Cargado en carrito' : 'Cargar al POS →'}
              </button>
            )}
          </div>
        )
      })}

      <button
        onClick={() => refetch()}
        className="text-[11px] text-gray-400 hover:text-gray-600 text-center py-1">
        Actualizar
      </button>
    </div>
  )
}
