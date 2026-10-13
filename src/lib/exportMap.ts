function inlineSvgStyles(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const originalNodes = svg.querySelectorAll('*')
  const clonedNodes = clone.querySelectorAll('*')
  if (originalNodes.length !== clonedNodes.length) return clone

  const relevant = new Set([
    'fill',
    'stroke',
    'stroke-width',
    'stroke-opacity',
    'stroke-linecap',
    'stroke-linejoin',
    'opacity',
    'font-size',
    'font-weight',
    'font-family',
    'text-anchor',
  ])

  originalNodes.forEach((orig, i) => {
    const copy = clonedNodes[i] as HTMLElement
    const computed = window.getComputedStyle(orig)
    const style = copy.style
    relevant.forEach((prop) => {
      const value = computed.getPropertyValue(prop)
      if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
        style.setProperty(prop, value)
      }
    })
  })
  return clone
}

function svgToString(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer()
  return serializer.serializeToString(svg)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportSVG(svg: SVGSVGElement, filename = 'wheat-qtl-map.svg') {
  const str = svgToString(svg)
  const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, filename)
}

// Print resolution. A figure is typically placed 7 in (two columns) wide; 600 dpi
// across that is 4,200 px, and the export goes past it so a panel can be
// cropped or enlarged without softening. Canvases have a hard size limit
// (about 16,000 px a side and 268 million px in total in current browsers), so
// the long side is capped below that rather than silently producing a blank file.
const EXPORT_LONG_SIDE_PX = 8000
const MAX_CANVAS_AREA = 120_000_000

export function exportRaster(
  svg: SVGSVGElement,
  format: 'png' | 'jpeg',
  filename = `wheat-qtl-map.${format}`,
  scale?: number
) {
  const styled = inlineSvgStyles(svg)
  const rect = svg.getBoundingClientRect()
  const longSide = Math.max(rect.width, rect.height, 1)
  const factor = Math.min(
    scale ?? Math.max(4, EXPORT_LONG_SIDE_PX / longSide),
    Math.sqrt(MAX_CANVAS_AREA / Math.max(1, rect.width * rect.height))
  )
  const width = Math.round(rect.width * factor)
  const height = Math.round(rect.height * factor)
  // The serialised SVG must carry its own size, or the browser rasterises it
  // at the on-screen size and then stretches that bitmap - which is what made
  // large exports look soft however high the scale was set.
  styled.setAttribute('width', String(width))
  styled.setAttribute('height', String(height))
  if (!styled.getAttribute('viewBox')) styled.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`)

  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(styled)
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(img, 0, 0, width, height)
    URL.revokeObjectURL(url)
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename)
    }, format === 'png' ? 'image/png' : 'image/jpeg', 1)
  }
  img.src = url
}
