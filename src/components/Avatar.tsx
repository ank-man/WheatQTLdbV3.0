interface Props {
  name: string
  src?: string
  size?: number
  className?: string
}

// Deterministic warm-palette colour derived from the name.
function colourFor(name: string): string {
  const palette = ['#cc9d3f', '#9a6628', '#7c4d24', '#b88231', '#5e3a1f', '#d8b665', '#a85a3c', '#6b4f2a']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, src, size = 64, className = '' }: Props) {
  const bg = colourFor(name)
  const text = initials(name)
  const fontSize = Math.round(size * 0.4)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        width={size}
        height={size}
        className={className}
        onError={(e) => {
          // Fall back to inline SVG if photo fails to load.
          const img = e.currentTarget as HTMLImageElement
          img.outerHTML = inlineSVG(name, size, bg, text, fontSize, className)
        }}
      />
    )
  }
  return (
    <span
      className={className}
      style={{ width: size, height: size, display: 'inline-block' }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: inlineSVG(name, size, bg, text, fontSize, '') }}
    />
  )
}

function inlineSVG(name: string, size: number, bg: string, text: string, fontSize: number, className: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${name}" class="${className}">
    <rect width="${size}" height="${size}" rx="${size / 2}" fill="${bg}"/>
    <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${text}</text>
  </svg>`
}
