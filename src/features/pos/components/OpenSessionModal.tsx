import { useState, useRef, useEffect } from 'react'
import { usePosStore } from '@/store/posStore'
import { useOpenSession } from '../hooks/useOpenSession'
import { useCashiers } from '../hooks/useCashiers'
import { api } from '@/lib/api'
import { CustomerAvatar } from './CustomerAvatar'
import { LoginPanel } from '@/features/auth/LoginPanel'
import type { Customer } from '../types/pos.types'

export function OpenSessionModal() {
  const [cashierName, setCashierName]   = useState('')
  const [openingCash, setOpeningCash]   = useState(500)
  const [loading, setLoading]           = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { data: rawCashiers = [] } = useCashiers()
  const inputRef  = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const openSessionMutation = useOpenSession()
  const { openSession, setDefaultCustomer } = usePosStore()
  const allCashiers = [...new Set(rawCashiers)] 

  // Filtra sugerencias según lo que escribe
  const suggestions = allCashiers.filter(c =>
    c.toLowerCase().includes(cashierName.toLowerCase()) &&
    c.toLowerCase() !== cashierName.toLowerCase()
  )

  // Cierra el dropdown si hace clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleOpen() {
  if (!cashierName.trim()) return
  setLoading(true)

  sessionStorage.removeItem('pos-store')

  try {
    const res = await openSessionMutation.mutateAsync({ cashierName, openingCash })

    let generalCustomer = null
    try {
      const { data: customers } = await api.get<Customer[]>('/customers', {
        params: { search: 'Público General' },
      })
      generalCustomer = customers.find(c => c.name === 'Público General') ?? null
    } catch (_) {}

    openSession(cashierName, openingCash, res.data.sessionId, res.data.openedAt)

    if (generalCustomer) {
      setDefaultCustomer(generalCustomer)
    }

  } catch (err) {
    console.error('Error abriendo sesión:', err)
  } finally {
    setLoading(false)
  }
}

  function selectSuggestion(name: string) {
    setCashierName(name)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 flex flex-col gap-5">

        <div>
          <h1 className="text-lg font-medium text-gray-900">Iniciar turno</h1>
          <p className="text-sm text-gray-500 mt-1">Carnicería POS</p>
        </div>

        <div className="flex flex-col gap-3">

          {/* Input con autocompletado */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nombre del cajero</label>
            <div className="relative" ref={wrapperRef}>
              <input
                ref={inputRef}
                className="input-base"
                placeholder="Ej. Ana García"
                value={cashierName}
                onChange={e => {
                  setCashierName(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && cashierName.trim()) handleOpen()
                  if (e.key === 'Escape') setShowSuggestions(false)
                  if (e.key === 'Tab') setShowSuggestions(false)
                }}
                autoFocus
              />

              {/* Dropdown de sugerencias */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map(name => (
                    <button
                      key={name}
                      onMouseDown={() => selectSuggestion(name)}
                      className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
                    >
                      <CustomerAvatar customer={{ name, color: '#6366f1' }} size="sm" />
                      {name}
                    </button>
                  ))}

                  {/* Opción de crear nuevo si no coincide exacto */}
                  {cashierName.trim() && !allCashiers.includes(cashierName.trim()) && (
                    <button
                      onMouseDown={() => {
                        setShowSuggestions(false)
                        inputRef.current?.focus()
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 border-t border-gray-100"
                    >
                      <CustomerAvatar customer={{ name: cashierName.trim(), color: '#6366f1' }} size="sm" />
                      Usar "{cashierName.trim()}" como nuevo cajero
                    </button>
                  )}
                </div>
              )}

              
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Fondo de caja inicial</label>
            <input
              className="input-base"
              type="number"
              step={50}
              min={0}
              value={openingCash === 0 ? '' : openingCash}
              placeholder="0"
              onFocus={e => e.target.select()}
              onChange={e => setOpeningCash(e.target.value === '' ? 0 : Number(e.target.value))}
            />
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 border border-gray-100">
          <div className="flex justify-between">
            <span>Fondo inicial</span>
            <span className="font-medium">${openingCash.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Fecha</span>
            <span className="font-medium">
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'short', day: '2-digit', month: 'short'
              })}
            </span>
          </div>
        </div>

        <button
          className="btn-primary"
          disabled={!cashierName.trim() || loading}
          onClick={handleOpen}
        >
          {loading ? 'Iniciando...' : 'Iniciar turno'}
        </button>

        <LoginPanel />
      </div>
    </div>
  )
}