import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CustomerDetail } from '../types/pos.types'

export function useCustomerDetail(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: async () => {
      const { data } = await api.get<CustomerDetail>(`/customers/${customerId}`)
      return data
    },
    enabled: !!customerId,
    staleTime: 0,      
    gcTime: 0,          
  })
}

export function useMarkDebtPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (debtId: string) => api.post(`/customers/debts/${debtId}/pay`),
    onSuccess: (_, debtId) => {
      qc.invalidateQueries({ queryKey: ['customer-detail'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useSetCustomerPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, productId, customPrice }: {
      customerId: string; productId: string; customPrice: number
    }) => api.put(`/customers/${customerId}/prices/${productId}`, { customPrice }),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ['customer-detail', customerId] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteCustomerPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, productId }: { customerId: string; productId: string }) =>
      api.delete(`/customers/${customerId}/prices/${productId}`),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ['customer-detail', customerId] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}