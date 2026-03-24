import { useState } from 'react'
import { useStockStatus, useRegisterEntry, useRegisterWaste, useSetAlert, useMovements, useUpdateProductPrice } from './hooks/useInventory'
import type { StockStatusDto } from './types/inventory.types'

type Modal = 'entry' | 'waste' | 'alert' | 'movements' | null

const SOURCES  = ['Ranch', 'Supplier', 'Adjustment']
const REASONS  = ['Expired', 'ProcessLoss', 'Damaged', 'Other']
const SOURCE_LABELS: Record<string, string>  = { Ranch: 'Rancho', Supplier: 'Proveedor', Adjustment: 'Ajuste' }
const REASON_LABELS: Record<string, string>  = { Expired: 'Vencido', ProcessLoss: 'Merma proceso', Damaged: 'Dañado', Other: 'Otro' }

export function InventoryPage() {
  const updatePrice = useUpdateProductPrice()
  const [wasteError, setWasteError] = useState('')
  const [entryError, setEntryError] = useState('')
  const [editingPrice, setEditingPrice] = useState<{ productId: string; value: string } | null>(null)
  const { data: stock = [], isLoading } = useStockStatus()
  const [modal, setModal]           = useState<Modal>(null)
  const [selected, setSelected]     = useState<StockStatusDto | null>(null)
  const [search, setSearch]         = useState('')
  const [filterAlert, setFilterAlert] = useState(false)

  const registerEntry = useRegisterEntry()
  const registerWaste = useRegisterWaste()
  const setAlert      = useSetAlert()

  const [entryForm, setEntryForm] = useState({ quantityKg: '', costPerKg: '', source: 'Ranch', notes: '' })
  const [wasteForm, setWasteForm] = useState({ quantityKg: '', reason: 'Expired', notes: '' })
  const [alertForm, setAlertForm] = useState({ minimumStockKg: '' })

  const { data: movements = [] } = useMovements(
    modal === 'movements' ? selected?.productId ?? null : null
  )

  const filtered = stock
    .filter(s => !search || s.productName.toLowerCase().includes(search.toLowerCase()))
    .filter(s => !filterAlert || s.isBelowMinimum)
    .sort((a, b) => {
      // Productos bajo mínimo primero
      if (a.isBelowMinimum !== b.isBelowMinimum) return a.isBelowMinimum ? -1 : 1
      return a.productName.localeCompare(b.productName)
    })

  const alertCount = stock.filter(s => s.isBelowMinimum).length

  function openModal(product: StockStatusDto, type: Modal) {
    setSelected(product)
    setModal(type)
    if (type === 'alert') setAlertForm({ minimumStockKg: String(product.minimumStockKg || '') })
  }

  async function submitEntry() {
  if (!selected) return
  setEntryError('')

  const qty = Number(entryForm.quantityKg)
  if (qty <= 0) {
    setEntryError('Ingresa una cantidad válida')
    return
  }

  try {
    await registerEntry.mutateAsync({
      productId:  selected.productId,
      quantityKg: qty,
      costPerKg:  Number(entryForm.costPerKg),
      source:     entryForm.source,
      notes:      entryForm.notes || undefined,
    })
    setModal(null)
    setEntryForm({ quantityKg: '', costPerKg: '', source: 'Ranch', notes: '' })
  } catch (err: any) {
    const msg = err?.response?.data?.error ?? 'Error al registrar entrada'
    setEntryError(msg)
  }
}

  async function submitWaste() {
  if (!selected) return
  setWasteError('')

  const qty = Number(wasteForm.quantityKg)

  // Validación frontend antes de llamar al backend
  if (qty <= 0) {
    setWasteError('Ingresa una cantidad válida')
    return
  }
  if (qty > selected.currentStockKg) {
    setWasteError(
      `Stock insuficiente — solo hay ${selected.currentStockKg.toFixed(3)} kg de ${selected.productName}`
    )
    return
  }

  try {
    await registerWaste.mutateAsync({
      productId:  selected.productId,
      quantityKg: qty,
      reason:     wasteForm.reason,
      notes:      wasteForm.notes || undefined,
    })
    setModal(null)
    setWasteForm({ quantityKg: '', reason: 'Expired', notes: '' })
    setWasteError('')
  } catch (err: any) {
    const msg = err?.response?.data?.error ?? err?.message ?? 'Error al registrar merma'
    setWasteError(msg)
  }
}

  async function submitAlert() {
    if (!selected) return
    await setAlert.mutateAsync({
      productId: selected.productId,
      minimumStockKg: Number(alertForm.minimumStockKg),
    })
    setModal(null)
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stock actual, entradas y merma</p>
        </div>
        {alertCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2 self-start">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-700 font-medium">
              {alertCount} producto{alertCount > 1 ? 's' : ''} bajo mínimo
            </span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          className="input-base flex-1"
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={filterAlert}
            onChange={e => setFilterAlert(e.target.checked)}
            className="rounded"
          />
          Solo alertas
        </label>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">Cargando inventario...</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            <table className="w-full text-sm" style={{ minWidth: '500px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Producto</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Stock actual</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Mínimo</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">Vendido 7d</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">Merma 7d</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Prom/día</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Precio venta</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium"
                      style={{ minWidth: '90px' }}>      
                    Días rest.
                  </th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium"
                      style={{ minWidth: '280px' }}>     
                    Acciones
                  </th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const daysLeft = p.averageDailySales > 0
                  ? Math.floor(p.currentStockKg / p.averageDailySales)
                  : null

                const stockColor = p.isBelowMinimum
                  ? 'text-red-600 font-medium'
                  : daysLeft !== null && daysLeft <= 2
                    ? 'text-amber-600 font-medium'
                    : 'text-gray-900'

                return (
                  <tr key={p.productId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.productName}</p>
                      <p className="text-xs text-gray-400">{p.category}</p>
                    </td>
                    <td className={`px-4 py-3 text-right ${stockColor}`}>
                      {p.currentStockKg.toFixed(2)} kg
                      {p.isBelowMinimum && (
                        <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">!</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {p.minimumStockKg > 0 ? `${p.minimumStockKg.toFixed(1)} kg` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{p.totalSoldLast7Days.toFixed(2)} kg</td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{p.totalWasteLast7Days.toFixed(2)} kg</td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell">{p.averageDailySales.toFixed(2)} kg</td>
                    <td className="px-4 py-3 text-right">
                      {editingPrice?.productId === p.productId ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            type="number" step="0.01" min="0.01"
                            className="input-base w-20 text-right text-sm py-1"
                            value={editingPrice.value}
                            onChange={e => setEditingPrice({ productId: p.productId, value: e.target.value })}
                            onClick={() => setEditingPrice({
                              productId: p.productId,
                              value:     String(p.salePrice ?? 0) 
                            })}
                            autoFocus
                            onKeyDown={async e => {
                              if (e.key === 'Enter' && editingPrice.value) {
                                await updatePrice.mutateAsync({
                                  productId: p.productId,
                                  newPrice: Number(editingPrice.value),
                                })
                                setEditingPrice(null)
                              }
                              if (e.key === 'Escape') setEditingPrice(null)
                            }}
                          />
                          <button
                            onClick={async () => {
                              if (!editingPrice.value) return
                              await updatePrice.mutateAsync({
                                productId: p.productId,
                                newPrice: Number(editingPrice.value),
                              })
                              setEditingPrice(null)
                            }}
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-md"
                          >✓</button>
                          <button
                            onClick={() => setEditingPrice(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 px-1"
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingPrice({
                            productId: p.productId,
                            value: String(p.pricePerUnit ?? '')
                          })}
                          className="group flex items-center justify-end gap-1.5 ml-auto
                                     text-sm text-gray-700 hover:text-indigo-600 transition-colors"
                          title="Editar precio de venta"
                        >
                          <span className="font-medium">
                            ${(p.salePrice ?? 0).toFixed(2)}/kg
                          </span>
                          <svg
                            width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {daysLeft === null ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          daysLeft <= 1  ? 'bg-red-100 text-red-700'   :
                          daysLeft <= 3  ? 'bg-amber-100 text-amber-700' :
                                           'bg-green-100 text-green-700'
                        }`}>
                          ~{daysLeft}d
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">

                        {/* Entrada */}
                        <button
                          onClick={() => openModal(p, 'entry')}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg
                                     border transition-all min-h-[32px]
                                     text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                          title="Registrar entrada">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          <span className="hidden sm:inline">Entrada</span>
                        </button>

                        {/* Merma */}
                        <button
                          onClick={() => openModal(p, 'waste')}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg
                                     border transition-all min-h-[32px]
                                     text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                          title="Registrar merma">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          </svg>
                          <span className="hidden sm:inline">Merma</span>
                        </button>

                        {/* Alerta */}
                        <button
                          onClick={() => openModal(p, 'alert')}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg
                                     border transition-all min-h-[32px]
                                     text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100"
                          title={`Stock mínimo: ${p.minimumStockKg > 0 ? p.minimumStockKg + ' kg' : 'No configurado'}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>
                          <span className="hidden sm:inline">Alerta</span>
                        </button>

                        {/* Movimientos */}
                        <button
                          onClick={() => openModal(p, 'movements')}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg
                                     border transition-all min-h-[32px]
                                     text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100"
                          title="Ver movimientos">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="8" y1="6" x2="21" y2="6"/>
                            <line x1="8" y1="12" x2="21" y2="12"/>
                            <line x1="8" y1="18" x2="21" y2="18"/>
                            <line x1="3" y1="6" x2="3.01" y2="6"/>
                            <line x1="3" y1="12" x2="3.01" y2="12"/>
                            <line x1="3" y1="18" x2="3.01" y2="18"/>
                          </svg>
                          <span className="hidden sm:inline">Ver</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── Modal Entrada ───────────────────────────── */}
      {modal === 'entry' && selected && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Registrar entrada — {selected.productName}</span>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="modal-body">
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                Stock actual: <span className="font-medium">{selected.currentStockKg.toFixed(2)} kg</span>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Cantidad (kg)</label>
                <input className="input-base" type="number" step="0.1" min="0.1"
                  value={entryForm.quantityKg}
                  onChange={e => setEntryForm(f => ({ ...f, quantityKg: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Costo por kg</label>
                <input className="input-base" type="number" step="0.01" min="0"
                  value={entryForm.costPerKg}
                  onChange={e => setEntryForm(f => ({ ...f, costPerKg: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Origen</label>
                <select className="input-base" value={entryForm.source}
                  onChange={e => setEntryForm(f => ({ ...f, source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas (opcional)</label>
                <input className="input-base" value={entryForm.notes}
                  onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {entryForm.quantityKg && (
                <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
                  Stock resultante: <span className="font-medium">
                    {(selected.currentStockKg + Number(entryForm.quantityKg)).toFixed(2)} kg
                  </span>
                </div>
              )}
              <button className="btn-primary"
                disabled={!entryForm.quantityKg || registerEntry.isPending}
                onClick={submitEntry}>
                {registerEntry.isPending ? 'Registrando...' : 'Registrar entrada'}
              </button>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Merma ─────────────────────────────── */}
      {entryError && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50
                        border border-red-200 rounded-md px-2.5 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {entryError}
        </div>
      )}
      {modal === 'waste' && selected && (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <span className="modal-title">Registrar merma — {selected.productName}</span>
            <button onClick={() => { setModal(null); setWasteError('') }}
              className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="modal-body">
            <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700 flex justify-between">
              <span>Stock actual</span>
              <span className="font-medium">{selected.currentStockKg.toFixed(3)} kg</span>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Cantidad perdida (kg)</label>
              <input
                className={`input-base ${wasteError ? 'border-red-300' : ''}`}
                type="number" step="0.1" min="0.1"
                max={selected.currentStockKg}
                value={wasteForm.quantityKg}
                onChange={e => {
                  setWasteForm(f => ({ ...f, quantityKg: e.target.value }))
                  // Valida en tiempo real
                  const val = parseFloat(e.target.value)
                  if (val > selected.currentStockKg) {
                    setWasteError(`Máximo ${selected.currentStockKg.toFixed(3)} kg`)
                  } else {
                    setWasteError('')
                  }
                }}
              />
              {/* Error inline */}
              {wasteError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50
                                border border-red-200 rounded-md px-2.5 py-1.5 mt-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {wasteError}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Razón</label>
              <select className="input-base" value={wasteForm.reason}
                onChange={e => setWasteForm(f => ({ ...f, reason: e.target.value }))}>
                {REASONS.map(r => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Notas (opcional)</label>
              <input className="input-base" value={wasteForm.notes}
                onChange={e => setWasteForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <button
              className="btn-primary"
              disabled={!wasteForm.quantityKg || !!wasteError || registerWaste.isPending}
              onClick={submitWaste}>
              {registerWaste.isPending ? 'Registrando...' : 'Registrar merma'}
            </button>
            <button className="btn-secondary" onClick={() => { setModal(null); setWasteError('') }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}

      {/* ── Modal Alerta ─────────────────────────────── */}
      {modal === 'alert' && selected && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Stock mínimo — {selected.productName}</span>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-gray-500">
                Cuando el stock baje de este valor el sistema mostrará una alerta.
              </p>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Mínimo en kg</label>
                <input className="input-base" type="number" step="0.5" min="0"
                  value={alertForm.minimumStockKg}
                  onChange={e => setAlertForm({ minimumStockKg: e.target.value })} />
              </div>
              <p className="text-xs text-gray-400">
                Promedio de venta diaria: {selected.averageDailySales.toFixed(2)} kg/día —
                un mínimo de {(selected.averageDailySales * 2).toFixed(1)} kg cubre ~2 días.
              </p>
              <button className="btn-primary"
                disabled={!alertForm.minimumStockKg || setAlert.isPending}
                onClick={submitAlert}>
                Guardar
              </button>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Movimientos ────────────────────────── */}
      {modal === 'movements' && selected && (
        <div className="modal-overlay">
          <div className="modal max-h-[85vh] overflow-hidden flex flex-col max-w-2xl w-full">
            <div className="modal-header shrink-0">
              <span className="modal-title">Movimientos — {selected.productName}</span>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {movements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin movimientos en los últimos 30 días</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {movements.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        m.quantityKg > 0 ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{m.type}</p>
                        {m.reference && <p className="text-xs text-gray-400">{m.reference}</p>}
                      </div>
                      <span className={`text-sm font-medium ${
                        m.quantityKg > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {m.quantityKg > 0 ? '+' : ''}{m.quantityKg.toFixed(3)} kg
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}