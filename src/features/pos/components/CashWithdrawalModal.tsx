import { useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { useCashWithdrawal } from '../hooks/useCashWithdrawal'
import { useSessionSummary } from '../hooks/useSessionSummary'
import { fmt } from '@/lib/fmt'

interface Props { onClose: () => void }

export function CashWithdrawalModal({ onClose }: Props) {
  const session             = usePosStore(s => s.session)
  const { data: summary }   = useSessionSummary(session?.id)
  const withdraw            = useCashWithdrawal(session?.id)
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')

  const currentCash = summary?.expectedCash ?? session?.openingCash ?? 0
  const parsed      = parseFloat(amount) || 0
  const remaining   = Math.round((currentCash - parsed) * 100) / 100
  const canConfirm  = parsed > 0 && parsed <= currentCash

  async function handleConfirm() {
    await withdraw.mutateAsync({ amount: parsed, note: note.trim() || undefined })
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Retiro de caja</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="modal-body">
          {/* Current cash display */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-xs text-gray-500">Efectivo en caja</span>
            <span className="text-xl font-semibold text-gray-900">${fmt(currentCash)}</span>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Monto a retirar</label>
            <input
              type="number"
              className="input-base text-right text-xl"
              placeholder="0.00"
              min={0.01}
              step={0.01}
              value={amount}
              autoFocus
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Motivo <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              className="input-base"
              placeholder="Ej. Depósito a caja fuerte, pago proveedor..."
              maxLength={300}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {/* Remaining balance preview */}
          {parsed > 0 && (
            <div className={`rounded-lg p-3 border flex justify-between text-sm ${
              remaining >= 0
                ? 'bg-blue-50 border-blue-100'
                : 'bg-red-50 border-red-200'
            }`}>
              <span className={remaining >= 0 ? 'text-blue-700' : 'text-red-700'}>
                {remaining >= 0 ? 'Quedaría en caja' : 'Fondos insuficientes'}
              </span>
              <span className={`font-medium ${remaining >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                {remaining >= 0 ? `$${fmt(remaining)}` : `Faltan $${fmt(Math.abs(remaining))}`}
              </span>
            </div>
          )}

          <button
            className="btn-primary"
            disabled={!canConfirm || withdraw.isPending}
            onClick={handleConfirm}
          >
            {withdraw.isPending ? 'Registrando...' : 'Confirmar retiro'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>

          {withdraw.isError && (
            <p className="text-xs text-red-600 text-center">
              {(withdraw.error as any)?.response?.data?.error ?? 'Error al registrar el retiro'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
