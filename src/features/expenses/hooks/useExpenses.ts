import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ScheduledExpense, ExpenseRequest, ExpenseNotifications } from '../types/expense.types'

const QK_SCHEDULED = ['expenses-scheduled']
const QK_REQUESTS  = ['expenses-requests']
const QK_NOTIFS    = ['expense-notifications']

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: QK_SCHEDULED })
  qc.invalidateQueries({ queryKey: QK_REQUESTS })
  qc.invalidateQueries({ queryKey: QK_NOTIFS })
}

export function useScheduledExpenses() {
  return useQuery<ScheduledExpense[]>({
    queryKey: QK_SCHEDULED,
    queryFn: async () => { const { data } = await api.get('/expenses/scheduled'); return data },
    staleTime: 0,
    refetchInterval: 30_000,
  })
}

export function useExpenseRequests(status?: string, requestedBy?: string, from?: string, to?: string) {
  return useQuery<ExpenseRequest[]>({
    queryKey: [...QK_REQUESTS, status, requestedBy, from, to],
    queryFn: async () => {
      const { data } = await api.get('/expenses/requests', { params: { status, requestedBy, from, to } })
      return data
    },
    staleTime: 0,
    refetchInterval: 30_000,
  })
}

export function useExpenseNotifications(cashierName?: string) {
  return useQuery<ExpenseNotifications>({
    queryKey: [...QK_NOTIFS, cashierName],
    queryFn: async () => {
      const { data } = await api.get('/expenses/notifications', { params: { cashierName } })
      return data
    },
    refetchInterval: 30_000,
    staleTime: 0,
  })
}

export function useCreateScheduledExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string; amount: number; category: string; recurrence: string
      nextDueDate: string; alertDaysBefore: number; description?: string
    }) => api.post('/expenses/scheduled', body),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateScheduledExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string; name: string; amount: number; category: string; recurrence: string
      nextDueDate: string; alertDaysBefore: number; description?: string
    }) => api.put(`/expenses/scheduled/${id}`, body),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteScheduledExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/scheduled/${id}`),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useToggleScheduledExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/expenses/scheduled/${id}/toggle`),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateExpenseRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      description: string; amount: number; category: string; requestedBy: string
      sessionId?: string; scheduledExpenseId?: string; notes?: string
    }) => api.post('/expenses/requests', body),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useReviewExpenseRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string; approved: boolean; reviewedBy: string; denyReason?: string
    }) => api.put(`/expenses/requests/${id}/review`, body),
    onSuccess: () => invalidateAll(qc),
  })
}
