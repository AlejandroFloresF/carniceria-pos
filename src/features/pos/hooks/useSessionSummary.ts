import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SessionSummaryDto } from '../types/pos.types'

export function useSessionSummary(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-summary', sessionId],
    queryFn: async () => {
      const { data } = await api.get<SessionSummaryDto>(`/sessions/${sessionId}/summary`)
      return data
    },
    enabled: !!sessionId,
  })
}