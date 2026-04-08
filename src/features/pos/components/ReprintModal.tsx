import { useTicketByOrder } from '../hooks/useTicket'
import { TicketView } from './TicketView'

interface Props { orderId: string; onClose: () => void }

export function ReprintModal({ orderId, onClose }: Props) {
  const { data: ticket, isLoading } = useTicketByOrder(orderId)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-400">Cargando ticket...</div>
        ) : ticket ? (
          <TicketView ticket={ticket} onNewSale={onClose} closeLabel="Cerrar" />
        ) : (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500">No se encontró el ticket</p>
            <button className="btn-secondary mt-4" onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  )
}
