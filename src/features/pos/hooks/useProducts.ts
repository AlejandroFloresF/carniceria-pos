import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePosStore } from '@/store/posStore'

export function useProducts(search = '') {
  const selectedCustomer = usePosStore(s => s.selectedCustomer)
  const defaultCustomer  = usePosStore(s => s.defaultCustomer)
  const isRealCustomer   = selectedCustomer?.id !== defaultCustomer?.id

  return useQuery({
    queryKey: ['products', search.trim().toLowerCase(), selectedCustomer?.id ?? 'none'],
    queryFn: async () => {
      const params = search.trim() ? { search: search.trim() } : undefined

      if (isRealCustomer && selectedCustomer) {
        const { data } = await api.get(
          `/products/with-prices/${selectedCustomer.id}`,
          { params }
        )
        return data
      }

      const { data } = await api.get('/products', { params })
      return (data as any[]).map(p => ({
        ...p,
        effectivePrice: p.pricePerUnit,
        generalPrice:   p.pricePerUnit,
        hasCustomPrice: false,
      }))
    },
    staleTime: 30_000,
    enabled: true,
  })
}