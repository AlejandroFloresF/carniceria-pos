import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCloseSession() {
  return useMutation({
    mutationFn: (payload: { sessionId: string; closingCash: number }) =>
      api.post(`/sessions/${payload.sessionId}/close`, { closingCash: payload.closingCash }),
  })
}