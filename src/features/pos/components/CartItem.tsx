import { usePosStore } from '@/store/posStore'
import type { CartItem as CartItemType } from '../types/pos.types'
import { fmt } from '@/lib/fmt'

interface Props { item: CartItemType }

export function CartItem({ item }: Props) {
  const { updateQty, removeItem } = usePosStore()
  const { product, quantity } = item

  // effectivePrice existe cuando hay precio especial por cliente
  // pricePerUnit es el precio general sin cliente
  const unitPrice = (product as any).effectivePrice ?? (product as any).pricePerUnit ?? 0
  const lineTotal = unitPrice * quantity
  const hasCustomPrice = (product as any).hasCustomPrice === true

  return (
    <div className="flex items-center gap-2 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
        <div className="flex items-center gap-1">
          <p className={`text-xs ${hasCustomPrice ? 'text-indigo-500' : 'text-gray-400'}`}>
            ${fmt(unitPrice)}/{product.unit}
          </p>
          {hasCustomPrice && (
            <span className="text-xs bg-indigo-50 text-indigo-500 px-1 rounded">especial</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => updateQty(product.id, +(quantity - 0.25).toFixed(3))}
          className="w-6 h-6 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-sm flex items-center justify-center hover:bg-gray-100"
        >
          −
        </button>
        <span className="text-xs text-gray-700 min-w-[42px] text-center">
          {quantity}{product.unit}
        </span>
        <button
          onClick={() => updateQty(product.id, +(quantity + 0.25).toFixed(3))}
          className="w-6 h-6 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-sm flex items-center justify-center hover:bg-gray-100"
        >
          +
        </button>
      </div>

      <div className="text-right shrink-0 min-w-[52px]">
        <p className="text-sm font-medium text-gray-900">${fmt(lineTotal)}</p>
        <button
          onClick={() => removeItem(product.id)}
          className="text-xs text-gray-300 hover:text-red-400 transition-colors"
        >
          quitar
        </button>
      </div>
    </div>
  )
}