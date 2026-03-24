import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { ProductGrid } from './ProductGrid'
import { Cart } from './Cart'
import { useClientColor } from '../hooks/useClientColor'

export function POSLayout() {
  const [showCart, setShowCart] = useState(false)
  const { items } = usePosStore()
  const color = useClientColor()

  return (
    <div className="h-full relative overflow-hidden">

      {/* ── Desktop: dos columnas ─────────────────────────── */}
      <div className="hidden md:flex h-full">
        <div className="flex-1 overflow-y-auto p-4 min-w-0">
          <ProductGrid />
        </div>
        <div className="w-80 shrink-0 border-l border-gray-100 overflow-y-auto bg-white">
          <Cart />
        </div>
      </div>

      {/* ── Mobile: pantalla completa con tabs ───────────── */}
      <div className="flex flex-col h-full md:hidden">

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100 bg-white shrink-0">
          <button
            onClick={() => setShowCart(false)}
            className="flex-1 py-3 text-sm font-medium transition-colors relative"
            style={!showCart ? { color, borderBottom: `2px solid ${color}` } : { color: '#6b7280' }}
          >
            Productos
          </button>
          <button
            onClick={() => setShowCart(true)}
            className="flex-1 py-3 text-sm font-medium transition-colors relative"
            style={showCart ? { color, borderBottom: `2px solid ${color}` } : { color: '#6b7280' }}
          >
            Orden
            {items.length > 0 && (
              <span
                className="ml-1.5 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center"
                style={{ backgroundColor: color }}
              >
                {items.length}
              </span>
            )}
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {!showCart ? (
            <div className="p-3">
              <ProductGrid onProductAdded={() => setShowCart(true)} />
            </div>
          ) : (
            <Cart />
          )}
        </div>
      </div>
    </div>
  )
}