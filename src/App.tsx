import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { useAuthStore } from '@/store/authStore'
import { OpenSessionModal } from '@/features/pos/components/OpenSessionModal'
import { SessionBar } from '@/features/pos/components/SessionBar'
import { POSLayout } from '@/features/pos/components/POSLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { GastosPage } from './features/expenses/GastosPage'
import { NotificationBell } from './components/NotificationBell'

type Page = 'pos' | 'dashboard' | 'customers' | 'inventory' | 'reports' | 'gastos'

const ALL_PAGES: { id: Page; label: string; adminOnly: boolean; cashierOnly?: boolean }[] = [
  { id: 'pos',       label: 'Punto de venta', adminOnly: false, cashierOnly: true },
  { id: 'dashboard', label: 'Dashboard',       adminOnly: true  },
  { id: 'customers', label: 'Clientes',        adminOnly: false },
  { id: 'inventory', label: 'Inventario',      adminOnly: false },
  { id: 'reports',   label: 'Reportes',        adminOnly: true  },
  { id: 'gastos',    label: 'Gastos',          adminOnly: false },
]

export default function App() {
  const session                   = usePosStore(s => s.session)
  const { user, isAdmin, logout } = useAuthStore()
  const adminLoggedIn             = isAdmin()

  const [page, setPage] = useState<Page>(() => adminLoggedIn ? 'dashboard' : 'pos')
  const [focusExpenseId, setFocusExpenseId] = useState<string | undefined>()

  // Sin sesión de cajero y sin admin → pantalla de inicio de turno
  if (!session && !adminLoggedIn) return <OpenSessionModal />

  const visiblePages = ALL_PAGES.filter(p =>
    !(adminLoggedIn && p.cashierOnly) && (adminLoggedIn || !p.adminOnly)
  )
  const activePage   = visiblePages.some(p => p.id === page) ? page : (visiblePages[0]?.id ?? 'pos')

  return (
    <div className="flex flex-col h-screen">
      {/* Barra de sesión cajero */}
      {session && <SessionBar />}

      {/* Barra admin cuando está logueado sin turno de cajero */}
      {adminLoggedIn && !session && (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 text-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            <span className="font-medium text-gray-900">{user?.username}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
              Administrador
            </span>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-1 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex items-center px-4 py-2 bg-white border-b border-gray-100 shrink-0 gap-2">
        {/* Logo */}
        <img src="/logo.jpg" alt="Carnicería Gradilla" className="h-8 w-8 rounded-full object-cover shrink-0" />

        {/* tabs — overflow scrolls horizontally but never clips the bell */}
        <div className="flex flex-wrap items-center gap-1 flex-1 overflow-x-auto min-w-0">
          {visiblePages.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`text-sm px-4 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activePage === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Bell + logout — outside the scrollable tabs so dropdown never clips */}
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell
            cashierName={adminLoggedIn ? undefined : session?.cashierName}
            onNavigate={(requestId) => {
              setPage('gastos')
              if (requestId) setFocusExpenseId(requestId)
            }}
          />
          {adminLoggedIn && session && (
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
            >
              Salir (admin)
            </button>
          )}
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        {activePage === 'pos' && (
          session
            ? <POSLayout />
            : <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No hay turno de caja abierto.
              </div>
        )}
        {activePage === 'dashboard' && <div className="h-full overflow-y-auto"><DashboardPage /></div>}
        {activePage === 'customers' && <div className="h-full overflow-y-auto"><CustomersPage /></div>}
        {activePage === 'inventory' && <div className="h-full overflow-y-auto"><InventoryPage /></div>}
        {activePage === 'reports'   && <div className="h-full overflow-y-auto"><ReportsPage /></div>}
        {activePage === 'gastos'    && (
          <div className="h-full overflow-y-auto">
            <GastosPage
              focusRequestId={focusExpenseId}
              onClearFocus={() => setFocusExpenseId(undefined)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
