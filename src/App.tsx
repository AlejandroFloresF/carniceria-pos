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
import { MonitorPage } from './features/monitor/MonitorPage'
import { SettingsPage } from './features/auth/SettingsPage'
import { ResetPasswordModal } from './features/auth/ResetPasswordModal'
import { NotificationBell } from './components/NotificationBell'
import { useStockShortageAlerts } from '@/features/pos/hooks/useCustomerOrders'

type Page = 'pos' | 'dashboard' | 'monitor' | 'customers' | 'inventory' | 'reports' | 'gastos' | 'settings'

const ALL_PAGES: { id: Page; label: string; adminOnly: boolean; cashierOnly?: boolean }[] = [
  { id: 'pos',       label: 'Punto de venta', adminOnly: false, cashierOnly: true },
  { id: 'dashboard', label: 'Dashboard',       adminOnly: true  },
  { id: 'monitor',   label: 'Monitor',         adminOnly: true  },
  { id: 'customers', label: 'Clientes',        adminOnly: false },
  { id: 'inventory', label: 'Inventario',      adminOnly: false },
  { id: 'reports',   label: 'Reportes',        adminOnly: true  },
  { id: 'gastos',    label: 'Gastos',          adminOnly: false },
  { id: 'settings',  label: 'Configuración',   adminOnly: true  },
]

// Check for reset-token in URL on load
const initialResetToken = new URLSearchParams(window.location.search).get('reset-token')

export default function App() {
  const session                   = usePosStore(s => s.session)
  const { user, isAdmin, logout } = useAuthStore()
  const adminLoggedIn             = isAdmin()

  const [page, setPage] = useState<Page>(() => adminLoggedIn ? 'dashboard' : 'pos')
  const [focusExpenseId, setFocusExpenseId] = useState<string | undefined>()
  const [resetToken, setResetToken] = useState<string | null>(initialResetToken)
  const { data: stockAlerts = [] } = useStockShortageAlerts()
  // Password reset modal — shown regardless of login state
  if (resetToken) {
    return (
      <ResetPasswordModal
        token={resetToken}
        onClose={() => {
          setResetToken(null)
          // Clean the URL
          window.history.replaceState({}, '', window.location.pathname)
        }}
      />
    )
  }

  // Sin sesión de cajero y sin admin → pantalla de inicio de turno
  if (!session && !adminLoggedIn) return <OpenSessionModal />

  const visiblePages = ALL_PAGES.filter(p =>
    !(adminLoggedIn && p.cashierOnly) && (adminLoggedIn || !p.adminOnly)
  )
  const activePage   = visiblePages.some(p => p.id === page) ? page : (visiblePages[0]?.id ?? 'pos')

  return (
    <div className="flex flex-col h-screen">

      {/* ── Header principal ─────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 h-13 bg-white border-b border-gray-100 shrink-0" style={{ height: '52px' }}>

        {/* Logotipo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative shrink-0">
            {/* Luz giratoria periódica detrás del logo */}
            <div className="absolute -inset-1 rounded-full animate-logo-sweep pointer-events-none" />
            {/* Glow ring pulsante */}
            <div className="absolute -inset-0.5 rounded-full animate-logo-glow pointer-events-none" />
            <img src="/logo.jpg" alt="Gradilla" className="relative z-10 h-8 w-8 rounded-full object-cover ring-2 ring-white" />
          </div>
          <span className="hidden sm:block font-semibold text-gray-800 text-sm leading-tight">
            Gradilla<br />
            <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">100% Est. 1938</span>
          </span>
        </div>

        {/* Divisor */}
        <div className="hidden sm:block w-px h-6 bg-gray-100 shrink-0" />

        {/* Tabs de navegación */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto min-w-0 no-scrollbar">
          {visiblePages.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-medium ${
                activePage === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Derecha: campana + usuario */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell
            cashierName={adminLoggedIn ? undefined : session?.cashierName}
            isAdmin={adminLoggedIn}
            onNavigate={(requestId) => {
              setPage('gastos')
              if (requestId) setFocusExpenseId(requestId)
            }}
            onStockAlert={() => setPage('customers')}
          />

          {/* Chip de usuario */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
            <div className="flex items-center gap-1.5">
              {/* Avatar */}
              {user?.profilePhoto
                ? <img
                    src={user.profilePhoto}
                    alt="perfil"
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-indigo-200 cursor-pointer shrink-0"
                    onClick={() => adminLoggedIn && setPage('settings')}
                    title="Configuración"
                  />
                : <span className={`w-2 h-2 rounded-full shrink-0 ${adminLoggedIn ? 'bg-indigo-500' : 'bg-green-400'}`} />
              }
              <span className="text-sm font-medium text-gray-800 hidden sm:block">{user?.username}</span>
              {adminLoggedIn && (
                <span className="hidden md:inline text-[10px] font-semibold uppercase tracking-wide text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
            {adminLoggedIn && (
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 animate-logout-pulse"
                title="Cerrar sesión"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra de sesión cajero (sub-header compacto) */}
      {session && <SessionBar />}

      {/* Stock shortage alert — polled every 5 min */}
      {stockAlerts.length > 0 && (
        <div className="animate-stock-alert bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 shrink-0">
          <span className="text-red-500 text-sm shrink-0 animate-stock-icon">⚠</span>
          <p className="text-xs text-red-800 flex-1 min-w-0">
            <span className="font-medium">Stock insuficiente para pedidos próximos: </span>
            {stockAlerts.map((a, i) => (
              <span key={a.orderId}>
                {i > 0 && ' · '}
                <button
                  className="underline hover:text-red-900"
                  onClick={() => setPage('customers')}>
                  {a.customerName}
                </button>
                {' ('}
                {a.shortageItems.map(s => s.productName).join(', ')}
                {')'}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activePage === 'pos' && (
          session
            ? <POSLayout />
            : <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No hay turno de caja abierto.
              </div>
        )}
        {activePage === 'dashboard' && <div className="h-full overflow-y-auto"><DashboardPage /></div>}
        {activePage === 'monitor'   && <div className="h-full overflow-y-auto"><MonitorPage /></div>}
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
        {activePage === 'settings'  && <div className="h-full overflow-y-auto"><SettingsPage /></div>}
      </div>
    </div>
  )
}
