import { useState } from 'react'
import {
  useCustomerOrders,
  useCreateCustomerOrder,
  useUpdateCustomerOrder,
  useDeleteCustomerOrder,
} from '../pos/hooks/useCustomerOrders'
import { useProducts } from '../pos/hooks/useProducts'
import type { Customer, CustomerOrder } from '../pos/types/pos.types'

const RECURRENCE_OPTIONS = [
  { value: 'None',       label: 'Una sola vez'  },
  { value: 'Weekly',     label: 'Semanal'       },
  { value: 'Biweekly',   label: 'Quincenal'     },
  { value: 'Monthly',    label: 'Mensual'       },
  { value: 'Bimonthly',  label: 'Bimestral'     },
  { value: 'Annual',     label: 'Anual'         },
]

const RECURRENCE_LABEL: Record<string, string> = Object.fromEntries(
  RECURRENCE_OPTIONS.map(o => [o.value, o.label])
)

interface OrderItemForm {
  productId:   string
  productName: string
  quantityKg:  string
}

interface OrderForm {
  recurrence:       string
  nextDeliveryDate: string
  notes:            string
  items:            OrderItemForm[]
}

const EMPTY_FORM: OrderForm = {
  recurrence:       'None',
  nextDeliveryDate: new Date().toISOString().slice(0, 10),
  notes:            '',
  items:            [],
}

// ── OrderFormModal ─────────────────────────────────────────────────────────────

function OrderFormModal({
  color,
  customerId,
  editing,
  onClose,
}: {
  color: string
  customerId: string
  editing: CustomerOrder | null
  onClose: () => void
}) {
  const { data: products = [] } = useProducts('')
  const create = useCreateCustomerOrder()
  const update = useUpdateCustomerOrder()

  const [form, setForm] = useState<OrderForm>(() => {
    if (!editing) return EMPTY_FORM
    return {
      recurrence:       editing.recurrence,
      nextDeliveryDate: editing.nextDeliveryDate.slice(0, 10),
      notes:            editing.notes ?? '',
      items:            editing.items.map(i => ({
        productId:   i.productId,
        productName: i.productName,
        quantityKg:  String(i.quantityKg),
      })),
    }
  })

  const [selectedProduct, setSelectedProduct] = useState('')

  function addItem() {
    if (!selectedProduct) return
    if (form.items.some(i => i.productId === selectedProduct)) return
    const p = (products as any[]).find(p => p.id === selectedProduct)
    if (!p) return
    setForm(f => ({
      ...f,
      items: [...f.items, { productId: p.id, productName: p.name, quantityKg: '' }],
    }))
    setSelectedProduct('')
  }

  function updateItemQty(idx: number, value: string) {
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], quantityKg: value }
      return { ...f, items }
    })
  }

  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const isValid = form.items.length > 0 &&
    form.items.every(i => parseFloat(i.quantityKg) > 0) &&
    !!form.nextDeliveryDate

  async function handleSubmit() {
    const payload = {
      customerId,
      recurrence:       form.recurrence,
      nextDeliveryDate: new Date(form.nextDeliveryDate).toISOString(),
      notes:            form.notes || undefined,
      items:            form.items.map(i => ({
        productId:   i.productId,
        productName: i.productName,
        quantityKg:  parseFloat(i.quantityKg),
      })),
    }
    if (editing) {
      await update.mutateAsync({ ...payload, orderId: editing.id })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const availableProducts = (products as any[]).filter(
    p => !form.items.some(i => i.productId === p.id)
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4"
      onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
          style={{ borderTop: `3px solid ${color}` }}>
          <span className="text-base font-medium text-gray-900">
            {editing ? 'Editar pedido' : 'Nuevo pedido'}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Recurrencia */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Frecuencia</label>
            <select
              className="input-base"
              value={form.recurrence}
              onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
              {RECURRENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Fecha próxima entrega */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              {form.recurrence === 'None' ? 'Fecha de entrega' : 'Próxima entrega'}
            </label>
            <input
              type="date"
              className="input-base"
              value={form.nextDeliveryDate}
              onChange={e => setForm(f => ({ ...f, nextDeliveryDate: e.target.value }))}
            />
          </div>

          {/* Productos */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Productos del pedido</label>
            {form.items.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {form.items.map((item, idx) => (
                  <div key={item.productId} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-gray-700 truncate">{item.productName}</span>
                    <input
                      type="number" step="0.1" min="0.1"
                      className="input-base w-24 text-right py-1 text-sm"
                      placeholder="kg"
                      value={item.quantityKg}
                      onChange={e => updateItemQty(idx, e.target.value)}
                    />
                    <span className="text-xs text-gray-400">kg</span>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-sm leading-none px-1">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {availableProducts.length > 0 && (
              <div className="flex gap-2">
                <select
                  className="input-base flex-1 text-sm"
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}>
                  <option value="">+ Agregar producto...</option>
                  {availableProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={addItem}
                  disabled={!selectedProduct}
                  className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40 transition-colors"
                  style={{ color, borderColor: `${color}40` }}>
                  Agregar
                </button>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notas <span className="text-gray-300">(opcional)</span></label>
            <input
              className="input-base text-sm"
              placeholder="Ej. Entregar los lunes antes de las 9am"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || create.isPending || update.isPending}
            className="w-full py-2.5 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
            style={{ backgroundColor: color }}>
            {create.isPending || update.isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear pedido'}
          </button>
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── CustomerOrdersTab ──────────────────────────────────────────────────────────

export function CustomerOrdersTab({ customer }: { customer: Customer }) {
  const color = customer.color ?? '#6366f1'
  const { data: orders = [], isLoading } = useCustomerOrders(customer.id)
  const deleteOrder = useDeleteCustomerOrder()
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<CustomerOrder | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CustomerOrder | null>(null)

  function openCreate() { setEditing(null); setShowForm(true) }
  function openEdit(o: CustomerOrder) { setEditing(o); setShowForm(true) }

  async function handleDelete(o: CustomerOrder) {
    await deleteOrder.mutateAsync({ customerId: customer.id, orderId: o.id })
    setConfirmDelete(null)
  }

  return (
    <>
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Pedidos periódicos o puntuales. El stock reservado no puede venderse a otros clientes.
        </p>
        <button
          onClick={openCreate}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-all"
          style={{ color, borderColor: `${color}40`, backgroundColor: `${color}08` }}>
          + Nuevo pedido
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-gray-500">Sin pedidos registrados</p>
          <p className="text-xs text-gray-400 mt-1">Crea un pedido para reservar stock automáticamente</p>
        </div>
      ) : (
        orders.map(order => {
          const deliveryDate = new Date(order.nextDeliveryDate)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const daysUntil = Math.ceil(
            (deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )

          return (
            <div key={order.id}
              className="border rounded-xl p-4 flex flex-col gap-3"
              style={{
                borderColor: order.hasStockShortage ? '#fca5a5' : `${color}25`,
                backgroundColor: order.hasStockShortage ? '#fff5f5' : `${color}04`,
              }}>

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}15`, color }}>
                    {RECURRENCE_LABEL[order.recurrence] ?? order.recurrence}
                  </span>
                  {order.hasStockShortage && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      ⚠ Stock insuficiente
                    </span>
                  )}
                  {order.isUpcoming && !order.hasStockShortage && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      Próximo
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(order)}
                    className="text-xs text-gray-400 hover:text-indigo-600 border border-gray-200
                               hover:border-indigo-300 px-2 py-1 rounded-md transition-all">
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(order)}
                    className="text-xs text-gray-400 hover:text-red-500 border border-gray-200
                               hover:border-red-200 px-2 py-1 rounded-md transition-all">
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Fecha */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>📅</span>
                <span>
                  {deliveryDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {daysUntil === 0 && <span className="ml-1.5 font-medium text-amber-700">Hoy</span>}
                  {daysUntil === 1 && <span className="ml-1.5 font-medium text-amber-700">Mañana</span>}
                  {daysUntil > 1 && daysUntil <= 7 && (
                    <span className="ml-1.5 text-gray-400">en {daysUntil} días</span>
                  )}
                </span>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-1">
                {order.items.map(item => (
                  <div key={item.productId} className="flex justify-between text-xs">
                    <span className="text-gray-700">{item.productName}</span>
                    <span className="text-gray-500">{item.quantityKg} kg</span>
                  </div>
                ))}
              </div>

              {/* Nota */}
              {order.notes && (
                <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-md px-2.5 py-2">
                  📝 {order.notes}
                </p>
              )}
            </div>
          )
        })
      )}
    </div>

    {/* Order form modal */}
    {showForm && (
      <OrderFormModal
        color={color}
        customerId={customer.id}
        editing={editing}
        onClose={() => setShowForm(false)}
      />
    )}

    {/* Delete confirm */}
    {confirmDelete && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4"
        onClick={() => setConfirmDelete(null)}>
        <div className="bg-white rounded-xl w-full max-w-sm p-5 flex flex-col gap-4"
          onClick={e => e.stopPropagation()}>
          <p className="text-sm font-medium text-gray-900">¿Eliminar pedido?</p>
          <p className="text-xs text-gray-500">
            El stock de este pedido quedará disponible para ventas generales.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary text-sm">
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(confirmDelete)}
              disabled={deleteOrder.isPending}
              className="flex-1 text-sm text-white bg-red-600 hover:bg-red-700 px-4 py-2.5
                         rounded-lg font-medium disabled:opacity-40 transition-colors">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
