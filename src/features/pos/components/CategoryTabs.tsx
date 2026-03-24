import { useClientColor } from "../hooks/useClientColor"

interface Props {
  categories: string[]
  active: string
  onChange: (cat: string) => void
}

export function CategoryTabs({ categories, active, onChange }: Props) {
  const color = useClientColor()
  
  return (
    <div className="flex gap-2 flex-wrap">
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          style={active === cat ? { backgroundColor: `${color}15`, borderColor: color, color } : {}}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            active === cat ? '' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}