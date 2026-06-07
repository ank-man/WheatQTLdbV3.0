// Reusable wheat-stalk SVG decorations for the hero.
export function WheatStalk({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 80 220" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="wsg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d8b665" />
          <stop offset="60%" stopColor="#cc9d3f" />
          <stop offset="100%" stopColor="#7c4d24" />
        </linearGradient>
      </defs>
      <line x1="40" y1="20" x2="40" y2="220" stroke="url(#wsg)" strokeWidth="2" />
      {Array.from({ length: 7 }).map((_, i) => {
        const y = 30 + i * 22
        return (
          <g key={i}>
            <ellipse cx="28" cy={y} rx="8" ry="14" fill="url(#wsg)" opacity="0.85" transform={`rotate(-25 28 ${y})`} />
            <ellipse cx="52" cy={y} rx="8" ry="14" fill="url(#wsg)" opacity="0.85" transform={`rotate(25 52 ${y})`} />
          </g>
        )
      })}
      <ellipse cx="40" cy="14" rx="6" ry="12" fill="url(#wsg)" />
    </svg>
  )
}

export function WheatGrain({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 60" className={className} style={style} aria-hidden="true">
      <ellipse cx="20" cy="30" rx="12" ry="22" fill="#cc9d3f" />
      <path d="M20 8 Q22 30 20 52" stroke="#7c4d24" strokeWidth="1.2" fill="none" />
    </svg>
  )
}
