import { usePosStore } from '@/store/posStore'

export function useClientColor() {
  const selectedCustomer = usePosStore(s => s.selectedCustomer)
  const defaultCustomer  = usePosStore(s => s.defaultCustomer)
  const isDefault = selectedCustomer?.id === defaultCustomer?.id
  const color = isDefault
    ? '#6366f1'
    : (selectedCustomer as any)?.color ?? '#6366f1'
  return color
}