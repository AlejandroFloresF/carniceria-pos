import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DashboardData } from '../types/pos.types'

interface Filters {
  from: string
  to: string
  sessionId?: string
}

export function useDashboard(filters: Filters) {
  return useQuery({
    queryKey: ['dashboard', filters.from, filters.to, filters.sessionId],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>('/dashboard', { params: filters })
      return data
    },
  })
}