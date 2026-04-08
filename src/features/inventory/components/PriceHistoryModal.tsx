import { usePriceHistory } from '../hooks/useProductCrud'
import { fmt } from '@/lib/fmt'

interface Props {
  productId: string
  productName: string
  currentPrice: number
  onClose: () => void
}

export function PriceHistoryModal({ productId, productName, currentPrice, onClose }: Props) {
  const { data: history = [], isLoading } = usePriceHistory(productId)

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <span className="text-sm font-medium text-gray-900">Historial de precios</span>
            <p className="text-xs text-gray-400 mt-0.5">{productName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Precio actual */}
        <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 shrink-0 flex items-center justify-between">
          <span className="text-xs text-indigo-600 font-medium">Precio actual</span>
          <span className="text-sm font-semibold text-indigo-700">${fmt(currentPrice)}</span>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-10">Cargando...</p>
          ) : history.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">Sin cambios de precio registrados</p>
              <p className="text-xs text-gray-300 mt-1">Los cambios futuros aparecerán aquí</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Fecha</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Precio anterior</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Precio nuevo</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(h => {
                  const diff    = h.newPrice - h.oldPrice
                  const pct     = h.oldPrice > 0 ? ((diff / h.oldPrice) * 100) : 0
                  const up      = diff > 0
                  return (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(h.changedAt)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">${fmt(h.oldPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">${fmt(h.newPrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          up ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                        }`}>
                          {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full btn-secondary text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
