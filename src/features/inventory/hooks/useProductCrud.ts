import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ProductPriceHistoryDto } from '../types/inventory.types'

export interface ProductAdmin {
  id:           string
  name:         string
  category:     string
  pricePerUnit: number
  unit:         string
  stockKg:      number
  isActive:     boolean
  barcode?:     string
}

export function useAllProducts() {
  return useQuery<ProductAdmin[]>({
    queryKey: ['products-admin'],
    queryFn:  async () => { const { data } = await api.get('/products/all'); return data },
    staleTime: 0,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; category: string; price: number; unit: string; barcode?: string }) =>
      api.post('/products', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products-admin'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; category: string; price: number; unit: string; barcode?: string }) =>
      api.put(`/products/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products-admin'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
    },
  })
}

export function useToggleProductActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/products/${id}/toggle-active`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products-admin'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products-admin'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
    },
  })
}

export function usePriceHistory(productId: string | null) {
  return useQuery<ProductPriceHistoryDto[]>({
    queryKey: ['price-history', productId],
    queryFn:  async () => { const { data } = await api.get(`/products/${productId}/price-history`); return data },
    enabled:  !!productId,
    staleTime: 30_000,
  })
}
