import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Customer } from '../types/pos.types'

export function useCustomers(search = '') {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const { data } = await api.get<Customer[]>('/customers', {
        params: search ? { search } : undefined,
      })
      return data
    },
  })
}