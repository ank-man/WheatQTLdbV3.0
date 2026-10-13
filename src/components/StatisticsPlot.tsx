import { useEffect, useRef } from 'react'
import type { Data, Layout } from 'plotly.js'

interface Props {
  data: Data[]
  height?: number
  horizontal?: boolean
  stacked?: boolean
  categories?: string[]
  leftMargin?: number
  showLegend?: boolean
  filename: string
}

/** Plotly renders from the current CSV-derived arrays on every data change. */
export default function StatisticsPlot({
  data, height = 320, horizontal = false, stacked = false,
  categories, leftMargin, showLegend = false, filename,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    let disposed = false
    let resize: ResizeObserver | undefined
    import('plotly.js-basic-dist-min').then(({ default: Plotly }) => {
      if (disposed) return
      const axisFont = { size: 11, color: '#7d7d86' }
      const valueAxis = { gridcolor: '#ededf0', zeroline: false, tickformat: '~s', tickfont: axisFont, fixedrange: true }
      const categoryAxis = {
        gridcolor: 'rgba(0,0,0,0)', zeroline: false, tickfont: axisFont, fixedrange: true,
        categoryorder: categories ? 'array' as const : 'trace' as const, categoryarray: categories,
      }
      const layout: Partial<Layout> = {
        height,
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#42424a', size: 12 },
        margin: { l: leftMargin ?? (horizontal ? 185 : 44), r: 12, t: showLegend ? 34 : 10, b: horizontal ? 36 : 40 },
        bargap: 0.3,
        barmode: stacked ? 'stack' : 'group',
        showlegend: showLegend,
        legend: { orientation: 'h', y: 1.14, x: 0, font: { size: 11, color: '#57575f' } },
        hoverlabel: { bgcolor: '#19191c', bordercolor: '#19191c', font: { color: '#ffffff', size: 12 } },
        xaxis: horizontal ? valueAxis : { ...categoryAxis, tickangle: 0 },
        yaxis: horizontal ? { ...categoryAxis, automargin: true } : valueAxis,
        // rounded data-ends, anchored to the baseline
        ...({ barcornerradius: 3 } as object),
      }
      Plotly.react(node, data, layout, {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'resetScale2d'],
        toImageButtonOptions: { format: 'png', filename, scale: 2 },
      })
      resize = new ResizeObserver(() => Plotly.Plots.resize(node))
      resize.observe(node)
    })
    return () => {
      disposed = true
      resize?.disconnect()
      import('plotly.js-basic-dist-min').then(({ default: Plotly }) => Plotly.purge(node))
    }
  }, [data, height, horizontal, stacked, categories, leftMargin, showLegend, filename])

  return <div ref={ref} className="w-full" role="img" aria-label={filename.replace(/-/g, ' ')} />
}
