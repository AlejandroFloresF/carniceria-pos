import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePosStore } from '@/store/posStore'
import type { PaymentMethod, TicketDto } from '../types/pos.types'

export function useCreateOrder() {
  const { items, discountPercent, session, resetCart, incrementSaleCount, selectedCustomer } = usePosStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { paymentMethod: PaymentMethod; cashReceived: number; debtNote?: string; advancePayment?: number; advancePaymentMethod?: string }) =>
      api.post<TicketDto>('/orders', {
        cashierSessionId:     session!.id,
        items:                items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        discountPercent,
        paymentMethod:        payload.paymentMethod,
        cashReceived:         payload.cashReceived,
        customerId:           selectedCustomer?.id ?? undefined,
        debtNote:             payload.debtNote,
        advancePayment:       payload.advancePayment ?? 0,
        advancePaymentMethod: payload.advancePaymentMethod ?? null,
      }),

    onSuccess: () => {
      resetCart()
      incrementSaleCount()
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-detail'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })   
      qc.invalidateQueries({ queryKey: ['movements'] })          
      qc.invalidateQueries({ queryKey: ['dashboard'] })         
    },
  })
}