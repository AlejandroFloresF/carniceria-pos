import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { usePosStore } from '@/store/posStore'
import { CategoryTabs } from './CategoryTabs'
import { WeightInput } from './WeightInput'
interface Props {
  onProductAdded?: () => void
}
export function ProductGrid({ onProductAdded }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const { data: products = [], isLoading } = useProducts(search) 
  const { selectedProduct, selectProduct } = usePosStore()

  const categories = ['Todos', ...Array.from(new Set((products as any[]).map(p => p.category)))]
  const filtered   = (products as any[]).filter(p =>
    activeCategory === 'Todos' || p.category === activeCategory
  )

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
            const displayPrice = product.effectivePrice ?? product.pricePerUnit ?? 0
            const hasCustomPrice = product.hasCustomPrice === true

            return (
              <button
                key={product.id}
                onClick={() => selectProduct(
                  selectedProduct?.id === product.id ? null : product
                )}
                className={`text-left p-3 rounded-lg border transition-all ${
                  selectedProduct?.id === product.id
                    ? 'border-indigo-400 bg-indigo-50'
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
                    ${displayPrice.toFixed(2)}
                  </span>
                  {hasCustomPrice && (
                    <span className="ml-1 text-xs text-gray-400 line-through">
                      ${product.generalPrice?.toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400">por {product.unit}</p>

                {hasCustomPrice && (
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