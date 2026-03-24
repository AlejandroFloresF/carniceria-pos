import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CashierSessionDto } from '../types/pos.types'

export function useOpenSession() {
  return useMutation({
    mutationFn: (payload: { cashierName: string; openingCash: number }) =>
      api.post<CashierSessionDto>('/sessions/open', payload),
  })
}