import { useEffect, useRef, useState } from 'react'

interface Option {
  value: string
  label: string
}

interface Props {
  icon?: React.ReactNode
  placeholder: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}

export function FilterPill({ icon, placeholder, options, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
          value
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        {icon && <span className="text-current opacity-60">{icon}</span>}
        <span className="max-w-[120px] truncate">
          {selected ? selected.label : placeholder}
        </span>
        {value ? (
          <span
            role="button"
            aria-label="Limpiar filtro"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}
            className="ml-0.5 rounded-full hover:bg-indigo-200 w-4 h-4 flex items-center justify-center text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            ×
          </span>
        ) : (
          <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 left-0 min-w-[180px] w-max max-w-[240px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.length > 6 && (
            <div className="px-2 pt-2 pb-1">
              <input
                autoFocus
                className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-300"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-52 py-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setSearch('') }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                !value
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {placeholder}
            </button>
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors truncate ${
                  value === o.value
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
