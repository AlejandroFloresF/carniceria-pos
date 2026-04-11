import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePosStore } from '@/store/posStore'
import type { PaymentMethod, TicketDto } from '../types/pos.types'

export function useCreateOrder() {
  const { items, discountPercent, session, resetCart, incrementSaleCount, selectedCustomer, loadedOrderId } = usePosStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      paymentMethod: PaymentMethod
      cashReceived: number
      debtNote?: string
      advancePayment?: number
      advancePaymentMethod?: string
      secondaryPaymentMethod?: string
      secondaryAmount?: number
    }) =>
      api.post<TicketDto>('/orders', {
        cashierSessionId:       session!.id,
        items:                  items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        discountPercent,
        paymentMethod:          payload.paymentMethod,
        cashReceived:           payload.cashReceived,
        customerId:             selectedCustomer?.id ?? undefined,
        debtNote:               payload.debtNote,
        advancePayment:         payload.advancePayment ?? 0,
        advancePaymentMethod:   payload.advancePaymentMethod ?? null,
        sourceCustomerOrderId:  loadedOrderId ?? undefined,
        secondaryPaymentMethod: payload.secondaryPaymentMethod ?? null,
        secondaryAmount:        payload.secondaryAmount ?? 0,
      }),

    onSuccess: () => {
      resetCart()
      incrementSaleCount()
      // Immediately refresh: product stock + customer debt totals
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-detail'] })
      // Defer until user navigates there: heavy aggregates that aren't visible at checkout
      qc.invalidateQueries({ queryKey: ['inventory-status'], refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ['movements'],        refetchType: 'active' })
      qc.invalidateQueries({ queryKey: ['dashboard'],        refetchType: 'active' })
    },
  })
}