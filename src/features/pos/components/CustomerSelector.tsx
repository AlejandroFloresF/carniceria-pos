import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCustomers } from '../hooks/useCustomers'
import { usePosStore } from '@/store/posStore'
import { api } from '@/lib/api'
import { CustomerAvatar } from './CustomerAvatar'
import type { Customer, ProductWithPrice } from '../types/pos.types'

export function CustomerSelector() {
  const [search, setSearch]     = useState('')
  const [open, setOpen]         = useState(false)
  const [pricingError, setPricingError] = useState(false)
  const qc                      = useQueryClient()

  const { data: customers = [] } = useCustomers(search)
  const {
    selectedCustomer,
    defaultCustomer,
    setCustomer,
    items,
    updateItemPrice,   // ← nuevo método que agregaremos al store
  } = usePosStore()

  const isDefault = selectedCustomer?.id === defaultCustomer?.id

  async function select(c: Customer) {
    setCustomer(c)
    setOpen(false)
    setSearch('')

    // Si el cliente tiene precios especiales, actualiza los items ya en el carrito
    setPricingError(false)
    if (items.length > 0) {
      try {
        const { data: products } = await api.get<ProductWithPrice[]>(
          `/products/with-prices/${c.id}`
        )

        const priceMap = Object.fromEntries(
          products.map(p => [p.id, p.effectivePrice])
        )

        // Actualiza precio de cada item (custom o base) al cambiar de cliente
        items.forEach(item => {
          if (priceMap[item.product.id] !== undefined) {
            updateItemPrice(item.product.id, priceMap[item.product.id])
          }
        })
      } catch (_) {
        setPricingError(true)
      }
    }

    // Invalida el cache de productos para que se recarguen con precios del cliente
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  async function resetToDefault() {
    if (defaultCustomer) {
      setCustomer(defaultCustomer)
      setPricingError(false)

      // Restaura precios generales en items del carrito
      if (items.length > 0) {
        try {
          const { data: products } = await api.get('/products')
          const priceMap = Object.fromEntries(
            (products as ProductWithPrice[]).map(p => [p.id, p.pricePerUnit ?? p.effectivePrice])
          )
          items.forEach(item => {
            if (priceMap[item.product.id] !== undefined) {
              updateItemPrice(item.product.id, priceMap[item.product.id])
            }
          })
        } catch (_) {
          setPricingError(true)
        }
      }

      qc.invalidateQueries({ queryKey: ['products'] })
    }
    setSearch('')
  }

  return (
    <div className="relative">
      {selectedCustomer ? (
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 border`}
            style={{
              backgroundColor: isDefault ? '#f9fafb' : `${selectedCustomer.color}15`,
              borderColor:      isDefault ? '#e5e7eb' : `${selectedCustomer.color}40`,
            }}>
          <div className="flex items-center gap-2">
            <CustomerAvatar customer={selectedCustomer} size="sm" />
            <div>
              <p className="text-sm font-medium" style={{ color: isDefault ? '#4b5563' : selectedCustomer.color }}>
                {selectedCustomer.name}
              </p>
              {!isDefault && selectedCustomer.discountPercent > 0 && (
                <p className="text-xs text-indigo-500">{selectedCustomer.discountPercent}% descuento</p>
              )}
              {isDefault && <p className="text-xs text-gray-400">Sin descuento</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isDefault && (
              <button onClick={resetToDefault}
                className="text-indigo-400 hover:text-indigo-600 text-lg ml-1"
                title="Volver a Público General">
                ✕
              </button>
            )}
            <button onClick={() => { setOpen(true); setSearch('') }}
              className={`text-xs ml-1 hover:underline ${isDefault ? 'text-gray-400' : 'text-indigo-500'}`}>
              Cambiar
            </button>
          </div>
        </div>
      ) : (
        <input className="input-base"
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      )}

      {pricingError && (
        <p className="mt-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          No se pudieron cargar los precios del cliente — usando precios generales.
        </p>
      )}

      {open && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {defaultCustomer && (
            <button onMouseDown={() => select(defaultCustomer)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CustomerAvatar customer={defaultCustomer} size="sm" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{defaultCustomer.name}</p>
                  <p className="text-xs text-gray-400">Cliente por defecto</p>
                </div>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sin descuento</span>
            </button>
          )}

          {customers
            .filter(c => c.id !== defaultCustomer?.id)
            .map(c => (
              <button key={c.id} onMouseDown={() => select(c)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex justify-between items-center border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <CustomerAvatar customer={c} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </div>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                  {c.discountPercent}% off
                </span>
              </button>
            ))}

          {customers.filter(c => c.id !== defaultCustomer?.id).length === 0 && search && (
            <p className="text-xs text-gray-400 px-3 py-3 text-center">No se encontraron clientes</p>
          )}
        </div>
      )}
    </div>
  )
}