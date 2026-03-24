import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Customer } from '../types/pos.types'

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'totalDebt'>) =>
      api.post<Customer>('/customers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Omit<Customer, 'totalDebt'>) =>
      api.put<Customer>(`/customers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}