import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ActiveSessionData {
  sessionId: string
  cashierName: string
  openedAt: string
  currentCash: number
  orderCount: number
  totalSales: number
  totalCash: number
  totalCard: number
  totalTransfer: number
  totalPayLater: number
  totalDiscounts: number
  lastSaleAt: string | null
  lastSaleDescription: string | null
  lastSaleAmount: number
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data } = await api.get<ActiveSessionData[]>('/sessions/active')
      return data
    },
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  })
}
