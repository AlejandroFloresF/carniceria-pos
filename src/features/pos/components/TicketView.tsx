import type { TicketDto } from '../types/pos.types'

const METHOD_LABELS: Record<string, string> = { Cash: 'Efectivo', Card: 'Tarjeta', Transfer: 'Transferencia', PayLater: 'A crédito' }

interface Props {
  ticket: TicketDto
  onNewSale: () => void
  closeLabel?: string
}

export function TicketView({ ticket, onNewSale, closeLabel = 'Nueva venta' }: Props) {
  const issuedAt = new Date(ticket.issuedAt)
  const change = (ticket.cashReceived ?? 0) - (ticket.total ?? 0)

  const handlePrint = () => {
    const content = document.getElementById('ticket-printable')
    if (!content) return

    const win = window.open('', '_blank', 'width=320,height=600')
    if (!win) return

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket ${ticket.folio}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 8px; width: 280px; }
    .text-center { text-align: center; }
    .text-xs { font-size: 11px; }
    .text-sm { font-size: 12px; }
    .font-medium { font-weight: 500; }
    .text-gray-400 { color: #9ca3af; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-900 { color: #111827; }
    .text-green-600 { color: #16a34a; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .flex-col { flex-direction: column; }
    .gap-1 > * + * { margin-top: 4px; }
    .gap-2 > * + * { margin-top: 8px; }
    .gap-3 > * + * { margin-top: 12px; }
    .p-5 { padding: 20px; }
    .pt-1 { padding-top: 4px; }
    .pt-3 { padding-top: 12px; }
    .pb-3 { padding-bottom: 12px; }
    .mt-0\\.5 { margin-top: 2px; }
    .border-t { border-top: 1px dashed #e5e7eb; }
    .border-b { border-bottom: 1px dashed #e5e7eb; }
    .border-dashed { border-style: dashed; }
    .border-gray-200 { border-color: #e5e7eb; }
    .logo { width: 80px; height: 80px; object-fit: cover; border-radius: 50%; display: block; margin: 0 auto 4px; }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`)

    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 250)
  }

  return (
    <div className="flex flex-col">
      <div id="ticket-printable" className="p-5 flex flex-col gap-3">
        <div className="text-center border-b border-dashed border-gray-200 pb-3">
          <img src="/logo.jpg" alt="Carnicería Gradilla" className="logo w-20 h-20 object-cover rounded-full mx-auto mb-1" />
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
          <div className="flex justify-between text-sm font-medium text-gray-900 pt-1">
            <span>Total</span><span>${ticket.total.toFixed(2)}</span>
          </div>
          {ticket.paymentMethod === 'PayLater' ? (
            <>
              <div className="flex justify-between text-xs text-gray-500 pt-1">
                <span>Método</span>
                <span>A crédito</span>
              </div>
              {ticket.cashReceived > 0 && (
                <div className="flex justify-between text-xs text-green-700">
                  <span>Anticipo recibido</span>
                  <span>${ticket.cashReceived.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-medium text-red-600">
                <span>Queda debiendo</span>
                <span>${(ticket.total - ticket.cashReceived).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-xs text-gray-500 pt-1">
                <span>Pago ({METHOD_LABELS[ticket.paymentMethod] ?? ticket.paymentMethod})</span>
                <span>${ticket.cashReceived.toFixed(2)}</span>
              </div>
              {ticket.paymentMethod === 'Cash' && change > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Cambio</span>
                  <span>${Math.floor(change).toFixed(0)}</span>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 border-t border-dashed border-gray-200 pt-3">
          Gracias por su compra
        </p>
      </div>

      <div className="p-4 flex flex-col gap-2 border-t border-gray-100">
        <button className="btn-secondary" onClick={handlePrint}>
          Imprimir ticket
        </button>
        <button className="btn-primary" onClick={onNewSale}>
          {closeLabel}
        </button>
      </div>
    </div>
  )
}