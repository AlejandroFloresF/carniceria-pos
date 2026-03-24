import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { OpenSessionModal } from '@/features/pos/components/OpenSessionModal'
import { SessionBar } from '@/features/pos/components/SessionBar'
import { POSLayout } from '@/features/pos/components/POSLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { ReportsPage } from './features/reports/ReportsPage'

type Page = 'pos' | 'dashboard' | 'customers' | 'inventory' | 'reports'

export default function App() {
  const session = usePosStore(s => s.session)
  const [page, setPage] = useState<Page>('pos')

  if (!session) return <OpenSessionModal />

  return (
    <div className="flex flex-col h-screen">
      <SessionBar />

      {/* Nav */}
      <nav className="flex flex-wrap items-center gap-1 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
        {([
          { id: 'pos',       label: 'Punto de venta' },
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'customers', label: 'Clientes' },
          { id: 'inventory', label: 'Inventario' },
          { id: 'reports', label: 'Reportes' }
        ] as { id: Page; label: string }[]).map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`text-sm px-4 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              page === item.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden">
        {page === 'pos'       && <POSLayout />}
        {page === 'dashboard' && <div className="h-full overflow-y-auto"><DashboardPage /></div>}
        {page === 'customers' && <div className="h-full overflow-y-auto"><CustomersPage /></div>}
        {page === 'inventory' && <div className="h-full overflow-y-auto"><InventoryPage /></div>}
        {page === 'reports' && <div className="h-full overflow-y-auto"><ReportsPage /></div>}
      </div>
    </div>
  )
}