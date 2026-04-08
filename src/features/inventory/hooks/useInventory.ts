import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StockStatusDto, InventoryEntryDto, WasteRecordDto, StockMovementDto } from '../types/inventory.types'

export function useStockStatus() {
  return useQuery({
    queryKey: ['inventory-status'],
    queryFn: async () => {
      const { data } = await api.get<StockStatusDto[]>('/inventory/status')
      return data
    },
    refetchInterval: 60_000,   // refresca cada minuto
  })
}

export function useMovements(productId: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ['movements', productId, from, to],
    queryFn: async () => {
      const { data } = await api.get<StockMovementDto[]>(
        `/inventory/movements/${productId}`,
        { params: { from, to } }
      )
      return data
    },
    enabled: !!productId,
  })
}

export function useUpdateProductPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, newPrice }: { productId: string; newPrice: number }) =>
      api.put(`/products/${productId}/price`, { newPrice }),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
      qc.invalidateQueries({ queryKey: ['price-history', productId] })
    },
  })
}

export function useRegisterEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      productId: string; quantityKg: number;
      costPerKg: number; source: string; notes?: string
    }) => api.post<InventoryEntryDto>('/inventory/entries', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useRegisterWaste() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      productId: string; quantityKg: number;
      reason: string; notes?: string
    }) => api.post<WasteRecordDto>('/inventory/waste', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useSetAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, minimumStockKg }: { productId: string; minimumStockKg: number }) =>
      api.put(`/inventory/alerts/${productId}`, { minimumStockKg }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-status'] }),
  })
}