import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { usePosStore } from '@/store/posStore'
import { useStockStatus } from '@/features/inventory/hooks/useInventory'
import { CategoryTabs } from './CategoryTabs'
import { WeightInput } from './WeightInput'
import { fmt } from '@/lib/fmt'

interface Props {
  onProductAdded?: () => void
}

export function ProductGrid({ onProductAdded }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [alertsExpanded, setAlertsExpanded] = useState(false)
  const { data: products = [], isLoading } = useProducts(search)
  const { data: stockStatus = [] } = useStockStatus()
  const { selectedProduct, selectProduct } = usePosStore()

  // Build lookup: productId → stock info (only for items with an active minimum set)
  const lowStockMap = new Map(
    stockStatus
      .filter(s => s.isBelowMinimum && s.minimumStockKg > 0)
      .map(s => [s.productId, s])
  )

  const categories = ['Todos', ...Array.from(new Set((products as any[]).map(p => p.category)))]
  const filtered   = (products as any[]).filter(p =>
    activeCategory === 'Todos' || p.category === activeCategory
  )

  const lowStockItems = stockStatus.filter(s => s.isBelowMinimum && s.minimumStockKg > 0)

  return (
    <div className="flex flex-col gap-3">
      <input
        className="input-base"
        placeholder="Buscar producto o escanear código..."
        value={search}
        onChange={e => {
          setSearch(e.target.value)
          setActiveCategory('Todos')
        }}
      />

      {/* Low-stock banner */}
      {lowStockItems.length > 0 && (
        <button
          onClick={() => setAlertsExpanded(v => !v)}
          className="w-full text-left bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-sm">⚠</span>
              <span className="text-xs font-medium text-amber-800">
                {lowStockItems.length} {lowStockItems.length === 1 ? 'producto con stock bajo' : 'productos con stock bajo'}
              </span>
            </div>
            <span className="text-[10px] text-amber-500">{alertsExpanded ? '▲' : '▼'}</span>
          </div>
          {alertsExpanded && (
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {lowStockItems.map(s => (
                <li key={s.productId} className="flex justify-between text-xs text-amber-700">
                  <span>{s.productName}</span>
                  <span className="font-medium">
                    {fmt(s.currentStockKg, 3)} / {fmt(s.minimumStockKg, 3)} {s.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </button>
      )}

      <CategoryTabs
        categories={categories}
        active={activeCategory}
        onChange={cat => { setActiveCategory(cat); selectProduct(null) }}
      />
      {isLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando productos...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map((product: any) => {
            const displayPrice  = product.effectivePrice ?? product.pricePerUnit ?? 0
            const hasCustomPrice = product.hasCustomPrice === true
            const stockInfo     = lowStockMap.get(product.id)
            const isLow         = !!stockInfo
            const isSelected    = selectedProduct?.id === product.id

            return (
              <button
                key={product.id}
                onClick={() => selectProduct(isSelected ? null : product)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50'
                    : isLow
                      ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {product.name}
                </p>

                <div className="mt-1">
                  <span className={`text-xs font-medium ${
                    hasCustomPrice ? 'text-indigo-600' : 'text-gray-500'
                  }`}>
                    ${fmt(displayPrice)}
                  </span>
                  {hasCustomPrice && (
                    <span className="ml-1 text-xs text-gray-400 line-through">
                      ${fmt(product.generalPrice ?? 0)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400">por {product.unit}</p>

                {isLow && !isSelected && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                    ⚠ {fmt(stockInfo!.currentStockKg, 3)} {stockInfo!.unit}
                  </span>
                )}
                {hasCustomPrice && !isLow && (
                  <span className="mt-1 inline-block text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                    precio especial
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selectedProduct && <WeightInput product={selectedProduct} />}
    </div>
  )
}