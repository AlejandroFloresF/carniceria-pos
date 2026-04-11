import { useState, useCallback, useRef } from 'react'
import { usePosStore } from '@/store/posStore'
import { ProductGrid } from './ProductGrid'
import { Cart } from './Cart'
import { PedidosPanel } from './PedidosPanel'
import { useClientColor } from '../hooks/useClientColor'
import { useTodayOrders } from '../hooks/useCustomerOrders'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { parseScan } from '@/lib/scanParser'
import { fetchProductByBarcode } from '../hooks/useProductByBarcode'

type MobileTab = 'productos' | 'pedidos' | 'orden'

type ScanToast =
  | { kind: 'ok';      message: string }
  | { kind: 'weight';  message: string }
  | { kind: 'error';   message: string }

export function POSLayout() {
  const [mobileTab, setMobileTab] = useState<MobileTab>('productos')
  const [showPedidos, setShowPedidos] = useState(true)
  const [scanToast, setScanToast]     = useState<ScanToast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { items, addItem, selectProduct, session } = usePosStore()
  const color = useClientColor()
  const { data: todayOrders = [] } = useTodayOrders()

  const handleScan = useCallback(async (raw: string) => {
    // Only process scans when a session is open
    if (!session) return

    const parsed = parseScan(raw)
    if (!parsed) return

    function toast(t: ScanToast) {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setScanToast(t)
      toastTimer.current = setTimeout(() => setScanToast(null), 3000)
    }

    const lookupCode = parsed.kind === 'weighted' ? parsed.plu : parsed.barcode
    const product = await fetchProductByBarcode(lookupCode)

    if (!product) {
      toast({ kind: 'error', message: `Código no encontrado: ${lookupCode}` })
      return
    }

    if (parsed.kind === 'weighted') {
      // Weight embedded in barcode — add directly to cart
      const weightKg = parsed.weightKg
      if (product.stockKg < weightKg) {
        toast({ kind: 'error', message: `Stock insuficiente para ${product.name}` })
        return
      }
      addItem(product as any, weightKg)
      toast({ kind: 'ok', message: `${product.name} — ${weightKg.toFixed(3)} kg agregado` })
      setMobileTab('orden')
    } else if (product.unit === 'piece') {
      // Non-weighted piece product — add 1 unit
      if (product.stockKg < 1) {
        toast({ kind: 'error', message: `Sin stock: ${product.name}` })
        return
      }
      addItem(product as any, 1)
      toast({ kind: 'ok', message: `${product.name} agregado` })
      setMobileTab('orden')
    } else {
      // kg product without weight in barcode — open WeightInput panel
      selectProduct(product as any)
      setMobileTab('productos')
      toast({ kind: 'weight', message: `${product.name} — ingresa el peso` })
    }
  }, [session, addItem, selectProduct, toastTimer])

  useBarcodeScanner(handleScan, !!session)

  return (
    <div className="h-full relative overflow-hidden">

      {/* ── Scan toast ───────────────────────────────────── */}
      {scanToast && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50
          flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium
          transition-all pointer-events-none
          ${scanToast.kind === 'ok'     ? 'bg-green-600 text-white' :
            scanToast.kind === 'weight' ? 'bg-indigo-600 text-white' :
                                          'bg-red-600 text-white'}`}>
          {scanToast.kind === 'ok'     && <span>✓</span>}
          {scanToast.kind === 'weight' && <span>⚖</span>}
          {scanToast.kind === 'error'  && <span>✕</span>}
          {scanToast.message}
        </div>
      )}

      {/* ── Desktop: tres columnas ────────────────────────── */}
      <div className="hidden md:flex h-full">

        {/* Pedidos del día (izquierda, colapsable) */}
        <div
          className="shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 flex flex-col transition-all duration-200"
          style={{ width: showPedidos ? '220px' : '36px' }}
        >
          {/* Header del panel */}
          <div className="flex items-center justify-between px-2 py-2.5 border-b border-gray-100 bg-white sticky top-0 z-10">
            {showPedidos && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-medium text-gray-700 truncate">Pedidos del día</span>
                {todayOrders.length > 0 && (
                  <span className="text-[10px] font-bold text-white bg-indigo-500 rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                    {todayOrders.length}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setShowPedidos(p => !p)}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-0.5"
              title={showPedidos ? 'Colapsar' : 'Pedidos del día'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showPedidos
                  ? <path d="M15 18l-6-6 6-6" />
                  : <path d="M9 18l6-6-6-6" />}
              </svg>
            </button>
          </div>

          {showPedidos && <PedidosPanel />}

          {/* Collapsed: show count badge vertically */}
          {!showPedidos && todayOrders.length > 0 && (
            <div className="flex flex-col items-center pt-3 gap-1">
              <span className="text-[10px] font-bold text-white bg-indigo-500 rounded-full w-5 h-5 flex items-center justify-center">
                {todayOrders.length}
              </span>
            </div>
          )}
        </div>

        {/* Products grid (center) */}
        <div className="flex-1 overflow-y-auto p-4 min-w-0">
          <ProductGrid />
        </div>

        {/* Cart (right) */}
        <div className="w-80 shrink-0 border-l border-gray-100 overflow-y-auto bg-white">
          <Cart />
        </div>
      </div>

      {/* ── Mobile: tres tabs ────────────────────────────── */}
      <div className="flex flex-col h-full md:hidden">

        <div className="flex border-b border-gray-100 bg-white shrink-0">
          {([
            { id: 'productos', label: 'Productos' },
            {
              id: 'pedidos',
              label: 'Pedidos',
              badge: todayOrders.length > 0 ? todayOrders.length : undefined,
            },
            {
              id: 'orden',
              label: 'Orden',
              badge: items.length > 0 ? items.length : undefined,
            },
          ] as { id: MobileTab; label: string; badge?: number }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className="flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-1"
              style={
                mobileTab === tab.id
                  ? { color, borderBottom: `2px solid ${color}` }
                  : { color: '#6b7280' }
              }
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className="text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center"
                  style={{ backgroundColor: mobileTab === tab.id ? color : '#6366f1' }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {mobileTab === 'productos' && (
            <div className="p-3">
              <ProductGrid onProductAdded={() => setMobileTab('orden')} />
            </div>
          )}
          {mobileTab === 'pedidos' && (
            <PedidosPanel onOrderLoaded={() => setMobileTab('orden')} />
          )}
          {mobileTab === 'orden' && <Cart />}
        </div>
      </div>
    </div>
  )
}
