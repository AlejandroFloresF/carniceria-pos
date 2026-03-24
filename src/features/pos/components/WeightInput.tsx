import { useState } from 'react'
import { usePosStore } from '@/store/posStore'

interface Props {
  product: any
  onProductAdded?: () => void
}

export function WeightInput({ product, onProductAdded }: Props) {
  const [qty, setQty]     = useState('')
  const [error, setError] = useState('')
  const { addItem, selectProduct, items } = usePosStore()

  const alreadyInCart  = items.find(i => i.product.id === product.id)?.quantity ?? 0
  const availableStock = (product.stockKg ?? 0) - alreadyInCart
  const effectivePrice = product.effectivePrice ?? product.pricePerUnit ?? 0
  const parsedQty      = parseFloat(qty) || 0
  const lineTotal      = parsedQty * effectivePrice

  function handleAdd() {
    if (!qty || parsedQty <= 0) { setError('Ingresa una cantidad válida'); return }
    if (parsedQty > availableStock) { setError(`Máx ${availableStock.toFixed(3)} kg`); return }
    setError('')
    addItem(product, parsedQty)
    selectProduct(null)
    setQty('')
    onProductAdded?.()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

      {/* Nombre + stock */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-900">{product.name}</p>
          <p className="text-xs text-gray-500">${effectivePrice.toFixed(2)}/kg</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            availableStock <= 0
              ? 'bg-red-100 text-red-600'
              : availableStock < 2
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
          }`}>
            {availableStock <= 0 ? 'Sin stock' : `${availableStock.toFixed(2)} kg disp.`}
          </span>
          <button
            onClick={() => { selectProduct(null); setError('') }}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Input de cantidad */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            className={`input-base flex-1 text-center text-lg font-medium ${
              error ? 'border-red-300' : ''
            }`}
            value={qty}
            step="0.001"
            min="0.001"
            max={availableStock}
            placeholder="0.000"
            inputMode="decimal"
            disabled={availableStock <= 0}
            onChange={e => {
              const val = e.target.value
              if (val === '' || val === '.') { setQty(val); setError(''); return }
              const match = val.match(/^\d*\.?\d{0,3}$/)
              if (match) {
                setQty(val)
                const p = parseFloat(val)
                setError(p > availableStock ? `Máx ${availableStock.toFixed(3)} kg` : '')
              }
            }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <span className="text-sm text-gray-500 shrink-0">{product.unit}</span>
        </div>

        {/* Preview total */}
        {qty && parsedQty > 0 && !error && (
          <p className="text-xs text-gray-400 text-center mb-2">
            {parsedQty.toFixed(3)} kg × ${effectivePrice.toFixed(2)} =
            <span className="font-medium text-gray-700 ml-1">${lineTotal.toFixed(2)}</span>
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50
                          border border-red-200 rounded-lg px-2.5 py-2 mb-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Botón agregar — ancho completo en móvil */}
        <button
          onClick={handleAdd}
          disabled={!qty || parsedQty <= 0 || availableStock <= 0 || !!error}
          className="w-full py-3 text-sm font-medium text-white rounded-lg
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
        >
          + Agregar al carrito
        </button>
      </div>
    </div>
  )
}