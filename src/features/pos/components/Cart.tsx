import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { CartItem } from './CartItem'
import { OrderSummary } from './OrderSummary'
import { PaymentModal } from './PaymentModal'
import { CustomerSelector } from './CustomerSelector'
import { useClientColor } from '../hooks/useClientColor'

export function Cart() {
  const { items, resetCart } = usePosStore()
  const [showPayment, setShowPayment] = useState(false)
  const color = useClientColor()
    
  return (
    <>
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Orden actual</span>
          {items.length > 0 && (
            <button
              onClick={resetCart}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sin productos aún</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {items.map(item => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Cliente</p>
          <CustomerSelector />
        </div>
        <OrderSummary />

        <button
          className="w-full py-3 px-4 text-white font-medium text-sm rounded-lg
                    disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: color }}
          disabled={items.length === 0}
          onClick={() => setShowPayment(true)}
        >
          Cobrar
        </button>
      </div>

      {showPayment && <PaymentModal onClose={() => setShowPayment(false)} />}
    </>
  )
}