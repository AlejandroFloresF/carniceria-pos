export interface ScheduledExpense {
  id: string
  name: string
  description?: string
  amount: number
  category: string
  recurrence: string
  nextDueDate: string
  alertDaysBefore: number
  isActive: boolean
  isOverdue: boolean
  isUpcoming: boolean
}

export interface ExpenseRequest {
  id: string
  description: string
  amount: number
  category: string
  status: 'Pending' | 'Approved' | 'Denied'
  requestedBy: string
  sessionId?: string
  scheduledExpenseId?: string
  reviewedBy?: string
  denyReason?: string
  notes?: string
  requestedAt: string
  reviewedAt?: string
}

export interface ExpenseNotificationItem {
  type: 'UpcomingExpense' | 'PendingRequest' | 'RequestReviewed'
  title: string
  subtitle: string
  referenceId?: string
  severity: 'info' | 'warning' | 'danger' | 'success'
}

export interface ExpenseNotifications {
  pendingRequestsCount: number
  upcomingExpensesCount: number
  items: ExpenseNotificationItem[]
}

export const EXPENSE_CATEGORIES = [
  'Servicios', 'Renta', 'Alimentación', 'Transporte', 'Mantenimiento', 'Otro'
]

export const RECURRENCE_OPTIONS = [
  { value: 'None',      label: 'Una sola vez' },
  { value: 'Weekly',    label: 'Semanal'      },
  { value: 'Biweekly',  label: 'Quincenal'    },
  { value: 'Monthly',   label: 'Mensual'      },
  { value: 'Annual',    label: 'Anual'        },
]

export const RECURRENCE_LABEL: Record<string, string> = {
  None: 'Una sola vez', Weekly: 'Semanal', Biweekly: 'Quincenal',
  Monthly: 'Mensual', Annual: 'Anual',
}
