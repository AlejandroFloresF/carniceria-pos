// src/features/pos/hooks/useTicket.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TicketDto } from '../types/pos.types'

export function useTicketByOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['ticket-by-order', orderId],
    queryFn: async () => {
      const { data } = await api.get<TicketDto>(`/tickets/by-order/${orderId}`)
      return data
    },
    enabled: !!orderId,
  })
}