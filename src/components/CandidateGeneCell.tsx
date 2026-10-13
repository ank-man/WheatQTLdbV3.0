import { ExternalLink } from 'lucide-react'
import { ensemblGeneUrl, ensemblSearchUrl, geneKind, grainGenesSearchUrl } from '../lib/externalLinks'

const SHOWN = 3

/**
 * A record's candidate gene(s), each linked to the resource that holds it:
 * GrainGenes for a gene symbol, Ensembl Plants for an annotation gene model.
 * Descriptive text (a protein family, an InterPro domain) is shown unlinked.
 */
export default function CandidateGeneCell({ value }: { value?: string | null }) {
  const genes = String(value ?? '').split(/[;,]/).map((g) => g.trim()).filter(Boolean)
  if (!genes.length) return <span className="text-wheat-300" aria-label="not reported">—</span>
  return (
    <span className="inline-flex max-w-[26rem] flex-wrap items-center gap-x-2 gap-y-0.5" title={genes.join('; ')}>
      {genes.slice(0, SHOWN).map((g, i) => {
        const kind = geneKind(g)
        const url = kind === 'symbol' ? grainGenesSearchUrl(g)
          : kind === 'model' ? (ensemblGeneUrl(g) ?? ensemblSearchUrl(g)) : null
        const label = g.length > 40 ? `${g.slice(0, 39)}…` : g
        return url ? (
          <a key={i} href={url} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-1 underline decoration-wheat-300 underline-offset-2 hover:decoration-wheat-700"
             title={kind === 'symbol' ? `Search ${g} in GrainGenes` : `Open ${g} in Ensembl Plants`}>
            {label} <ExternalLink className="h-3 w-3 flex-shrink-0 text-wheat-400" />
          </a>
        ) : <span key={i}>{label}</span>
      })}
      {genes.length > SHOWN && <span className="text-xs text-wheat-500">+{genes.length - SHOWN} more</span>}
    </span>
  )
}
