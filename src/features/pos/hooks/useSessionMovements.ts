import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CashMovementDto } from '../types/pos.types'

export function useSessionMovements(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-movements', sessionId],
    queryFn: async () => {
      const { data } = await api.get<CashMovementDto[]>(`/sessions/${sessionId}/movements`)
      return data
    },
    enabled:   !!sessionId,
    staleTime: 0,
  })
}
