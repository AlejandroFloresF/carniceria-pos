import { usePosStore } from '@/store/posStore'

export function OrderSummary() {
  const { subtotal, discountAmount, taxAmount, total, discountPercent, setDiscount } = usePosStore()

  return (
    <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">Descuento</span>
        <input
          type="number"
          className="input-base !py-1 w-16 text-right text-xs"
          value={discountPercent === 0 ? '' : discountPercent}
          placeholder="0"
          min={0} max={100} step={1}
          onFocus={e => e.target.select()}
          onChange={e => {
            const val = e.target.value
            const parsed = val === '' ? 0 : Math.min(100, Math.max(0, parseInt(val, 10) || 0))
            setDiscount(parsed)
          }}
        />
        <span className="text-xs text-gray-500">%</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Subtotal</span>
          <span>${subtotal().toFixed(2)}</span>
        </div>
        {discountPercent > 0 && (
          <div className="flex justify-between text-xs text-green-600">
            <span>Descuento ({discountPercent}%)</span>
            <span>−${discountAmount().toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-500">
          <span>IVA (16%)</span>
          <span>${taxAmount().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium text-gray-900 pt-1 border-t border-gray-100">
          <span>Total</span>
          <span>${total().toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}