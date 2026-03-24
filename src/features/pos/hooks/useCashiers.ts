import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCashiers() {
  return useQuery({
    queryKey: ['cashiers'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/sessions/cashiers')
      return data
    },
  })
}