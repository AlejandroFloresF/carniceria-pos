import type { TicketDto } from '../types/pos.types'

const METHOD_LABELS = { Cash: 'Efectivo', Card: 'Tarjeta', Transfer: 'Transferencia' }

interface Props {
  ticket: TicketDto
  onNewSale: () => void
}

export function TicketView({ ticket, onNewSale }: Props) {
  const issuedAt = new Date(ticket.issuedAt)
  const change = (ticket.cashReceived ?? 0) - (ticket.total ?? 0)

  return (
    <div className="flex flex-col">
      <div id="ticket-printable" className="p-5 flex flex-col gap-3">
        <div className="text-center border-b border-dashed border-gray-200 pb-3">
          <p className="font-medium text-gray-900">{ticket.shopName}</p>
          <p className="text-xs text-gray-400 mt-0.5">Cajero: {ticket.cashierName}</p>
          <p className="text-xs text-gray-400">
            Folio #{ticket.folio} · {issuedAt.toLocaleDateString('es-MX')} {issuedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {ticket.items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900">{item.productName}</span>
                <span className="text-gray-900">${item.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400">
                {item.quantity} {item.unit} × ${item.unitPrice.toFixed(2)}/{item.unit}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-200 pt-3 flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span><span>${ticket.subtotal.toFixed(2)}</span>
          </div>
          {ticket.discountAmount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Descuento</span><span>−${ticket.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-500">
            <span>IVA (16%)</span><span>${ticket.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-gray-900 pt-1">
            <span>Total</span><span>${ticket.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 pt-1">
            <span>Pago ({METHOD_LABELS[ticket.paymentMethod]})</span>
            <span>${ticket.cashReceived.toFixed(2)}</span>
          </div>
          {ticket.paymentMethod === 'Cash' && change > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Cambio</span>
              <span>${Math.floor(change).toFixed(0)}</span> 
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 border-t border-dashed border-gray-200 pt-3">
          Gracias por su compra
        </p>
      </div>

      <div className="p-4 flex flex-col gap-2 border-t border-gray-100">
        <button className="btn-secondary" onClick={() => window.print()}>
          Imprimir ticket
        </button>
        <button className="btn-primary" onClick={onNewSale}>
          Nueva venta
        </button>
      </div>
    </div>
  )
}