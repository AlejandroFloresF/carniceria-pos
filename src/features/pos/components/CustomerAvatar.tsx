interface Props {
  customer: { name: string; color: string; emoji?: string }
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { outer: 'w-6 h-6',  text: 'text-xs', emoji: 'text-sm'  },
  md: { outer: 'w-8 h-8',  text: 'text-sm', emoji: 'text-base' },
  lg: { outer: 'w-10 h-10', text: 'text-base', emoji: 'text-xl' },
}

export function CustomerAvatar({ customer, size = 'md' }: Props) {
  const s     = SIZES[size]
  const color = customer.color ?? '#6366f1'

  return (
    <div
      className={`${s.outer} rounded-full flex items-center justify-center
                  shrink-0 font-medium`}
      style={{ backgroundColor: customer.emoji ? `${color}15` : color }}
    >
      {customer.emoji ? (
        <span className={s.emoji}>{customer.emoji}</span>
      ) : (
        <span className={`${s.text} text-white`}>
          {customer.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}