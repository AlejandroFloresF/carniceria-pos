import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCashWithdrawal(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { amount: number; note?: string }) =>
      api.post(`/sessions/${sessionId}/withdraw`, {
        amount: payload.amount,
        note:   payload.note ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-movements', sessionId] })
      qc.invalidateQueries({ queryKey: ['session-summary',   sessionId] })
    },
  })
}
