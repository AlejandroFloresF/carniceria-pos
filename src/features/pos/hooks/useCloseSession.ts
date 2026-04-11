import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCloseSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { sessionId: string; closingCash: number }) =>
      api.post(`/sessions/${payload.sessionId}/close`, { closingCash: payload.closingCash }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-sessions'] })
    },
  })
}