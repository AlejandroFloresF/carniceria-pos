import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CustomerOrder, StockShortageOrder } from '../types/pos.types'

export function useCustomerOrders(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      const { data } = await api.get<CustomerOrder[]>(`/customers/${customerId}/orders`)
      return data
    },
    enabled: !!customerId,
    staleTime: 0,
    gcTime: 0,
  })
}

function invalidateOrderQueries(qc: ReturnType<typeof useQueryClient>, customerId: string) {
  qc.invalidateQueries({ queryKey: ['customer-orders', customerId] })
  qc.invalidateQueries({ queryKey: ['order-stock-alerts'] })
  qc.invalidateQueries({ queryKey: ['orders-today'] })
}

export function useCreateCustomerOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, ...body }: {
      customerId: string
      recurrence: string
      nextDeliveryDate: string
      items: { productId: string; productName: string; quantityKg: number }[]
      notes?: string
    }) => api.post<CustomerOrder>(`/customers/${customerId}/orders`, body),
    onSuccess: (_, { customerId }) => invalidateOrderQueries(qc, customerId),
  })
}

export function useUpdateCustomerOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, orderId, ...body }: {
      customerId: string
      orderId: string
      recurrence: string
      nextDeliveryDate: string
      items: { productId: string; productName: string; quantityKg: number }[]
      notes?: string
    }) => api.put<CustomerOrder>(`/customers/${customerId}/orders/${orderId}`, body),
    onSuccess: (_, { customerId }) => invalidateOrderQueries(qc, customerId),
  })
}

export function useDeleteCustomerOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, orderId }: { customerId: string; orderId: string }) =>
      api.delete(`/customers/${customerId}/orders/${orderId}`),
    onSuccess: (_, { customerId }) => invalidateOrderQueries(qc, customerId),
  })
}

// Polled every 5 minutes — used globally for stock shortage alerts
export function useStockShortageAlerts() {
  return useQuery({
    queryKey: ['order-stock-alerts'],
    queryFn: async () => {
      const { data } = await api.get<StockShortageOrder[]>('/customers/orders/stock-alerts')
      return data
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })
}

// Orders due today or overdue — used by the POS panel
export function useTodayOrders() {
  return useQuery({
    queryKey: ['orders-today'],
    queryFn: async () => {
      const { data } = await api.get<CustomerOrder[]>('/customers/orders/today')
      return data
    },
    staleTime: 0,
    gcTime: 0,
  })
}

export function useFulfillCustomerOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, orderId }: { customerId: string; orderId: string }) =>
      api.post(`/customers/${customerId}/orders/${orderId}/fulfill`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders-today'] })
      qc.invalidateQueries({ queryKey: ['order-stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['customer-orders'] })
    },
  })
}
