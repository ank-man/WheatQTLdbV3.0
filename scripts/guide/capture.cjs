/**
 * Screenshots for the user guide.
 *
 * Each section below is one annotated screenshot: the page to open, how to
 * prepare it, and the things to point at. For every callout the element's
 * position on the screenshot is recorded, so annotate.py can draw a numbered
 * arrow to it. The same list (titles, text, callouts) is written to
 * src/lib/guide.json, which the Tutorial page and the Word guide both read -
 * the site and the document cannot drift apart.
 *
 * Run through scripts/guide/build.sh (needs the built site served locally).
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright-core')

const BASE = process.env.GUIDE_BASE || 'http://localhost:4873'
const RAW = process.env.GUIDE_RAW
const SCALE = 2
const W = 1400

// side: where the numbered badge sits relative to the element it points at
const SECTIONS = [
  {
    id: 'home', title: 'Home page', url: '/', height: 1040,
    intro: 'The home page is the starting point: search the whole database, see how much it holds, and jump straight to a trait.',
    callouts: [
      { find: (p) => p.locator('header nav').first(), side: 'bottom', label: 'Menu', text: 'Every part of the database is one click away: Statistics, Map, Data, Search, Linkage maps, Publications and News.' },
      { find: (p) => p.getByPlaceholder('Search QTL, trait, marker, gene, reference…'), side: 'left', label: 'Search box', text: 'Type a QTL name, trait, marker, gene or author and press Search. The examples below it (Drought, Rht-B1, Fhb1 …) run a search in one click.' },
      { find: (p) => p.getByRole('link', { name: 'Browse data' }), side: 'left', label: 'Quick links', text: 'Open the data tables, the Statistics page or the Genome map.' },
      { find: (p) => p.locator('dl').first(), side: 'top', label: 'Live counts', text: 'The number of QTL, MetaQTL, epistatic QTL pairs, multi-trait QTL and species, read from the current data. Click a number to open that table.' },
      { find: (p) => p.getByRole('link', { name: /Abiotic stress/ }).first(), side: 'left', label: 'Browse by trait', text: 'Each tile shows how many QTL the trait has and opens the Search page with that trait already selected.' },
    ],
  },
  {
    id: 'home-chromosome', title: 'Home page: browse by chromosome and news', url: '/', height: 1000,
    prep: async (p) => { await p.getByRole('heading', { name: 'Browse by chromosome' }).scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -90)) },
    intro: 'Further down the home page you can pick a chromosome, read what has changed recently and copy the citation.',
    callouts: [
      { find: (p) => p.locator('svg[aria-label^="Miniature wheat karyotype"]'), side: 'top', label: 'Chromosome picker', text: 'The 21 chromosomes drawn at their relative lengths and coloured by subgenome. Click one to list all of its QTL.' },
      { find: (p) => p.getByRole('heading', { name: 'News' }), side: 'right', label: 'News', text: 'Data releases and new features, most recent first. “All news” opens the full list.' },
    ],
  },
  {
    id: 'search', title: 'Search', url: '/search?trait=Drought%20tolerance&chromosome=2B', height: 1080,
    prep: async (p) => { await p.getByText('QTL records match').waitFor({ timeout: 90000 }); await p.evaluate(() => window.scrollTo(0, 235)) },
    intro: 'Search combines free text with filters. Filters narrow the table as you set them, and the web address changes with them, so a search can be bookmarked or shared.',
    callouts: [
      { find: (p) => p.getByPlaceholder('QTL name, parameter, marker, gene, reference…'), side: 'top', label: 'Free text', text: 'Matches QTL name, trait, parameter, marker, candidate gene, reference, cross and population.' },
      { find: (p) => p.locator('label', { hasText: 'Trait class' }).locator('select'), side: 'top', label: 'Trait class', text: 'One of the five main traits. Choosing one limits the Trait list to its sub-categories.' },
      { find: (p) => p.locator('label', { hasText: /^Trait/ }).filter({ hasNotText: 'class' }).locator('select').first(), side: 'left', label: 'Trait', text: 'A single trait, such as Drought tolerance or Fungal resistance. Biofortification and Nutrient use efficiency offer a further Sub-trait list.' },
      { find: (p) => p.locator('label', { hasText: 'Chromosome' }).locator('select'), side: 'bottom', label: 'Chromosome and species', text: 'Limit the results to one chromosome or one species.' },
      { find: (p) => p.getByPlaceholder('min'), side: 'bottom', label: 'PVE range', text: 'Keep only QTL whose phenotypic variance explained falls between a minimum and a maximum (in %).' },
      { find: (p) => p.getByText('Has candidate gene'), side: 'right', label: 'Other filters', text: 'Show only QTL with a candidate gene, or only multi-trait (pleiotropic) QTL.' },
      { find: (p) => p.getByText('QTL records match'), side: 'right', label: 'Result count', text: 'How many records match, out of the whole database, and which traits they belong to.' },
      { find: (p) => p.getByRole('button', { name: 'Export CSV' }), side: 'top', label: 'Export CSV', text: 'Downloads exactly the rows that match, with every column, for use in R, Python or Excel.' },
      { find: (p) => p.getByRole('button', { name: 'Reset' }), side: 'left', label: 'Reset', text: 'Clears every filter.' },
    ],
  },
  {
    id: 'data', title: 'Data tables', url: '/data', height: 860,
    intro: 'The Data page lists every table in the database. Each opens as a sortable, searchable table that can be exported.',
    callouts: [
      { find: (p) => p.getByRole('link', { name: /^QTL QTL\/MTA/ }), side: 'left', label: 'QTL', text: 'All main effect QTL and marker–trait associations.' },
      { find: (p) => p.getByRole('link', { name: /MetaQTL Consensus/ }), side: 'left', label: 'MetaQTL and epistatic QTL', text: 'Consensus QTL regions across studies, and QTL × QTL interactions.' },
      { find: (p) => p.getByRole('link', { name: /Candidate Genes/ }), side: 'left', label: 'Candidate genes', text: 'Every gene named as a candidate, linked to GrainGenes or Ensembl Plants.' },
      { find: (p) => p.getByRole('link', { name: /GWAS Atlas associations/ }), side: 'right', label: 'GWAS Atlas associations', text: 'Marker–trait associations imported from GWAS Atlas. They are a separate table and are not part of the QTL counts.' },
      { find: (p) => p.getByRole('link', { name: /Studies awaiting curation/ }), side: 'right', label: 'Studies awaiting curation', text: 'Papers found in the literature that are not yet in the database.' },
    ],
  },
  {
    id: 'table', title: 'Working with a table', url: '/data/qtl', height: 900,
    prep: async (p) => { await p.getByRole('button', { name: 'Export CSV' }).waitFor({ timeout: 90000 }); await p.evaluate(() => window.scrollTo(0, 200)) },
    intro: 'Every table works the same way, whether it is QTL, MetaQTL, candidate genes or publications.',
    callouts: [
      { find: (p) => p.getByPlaceholder('Search across all fields…'), side: 'top', label: 'Search the table', text: 'Filters the rows as you type, across all columns.' },
      { find: (p) => p.locator('.badge', { hasText: 'rows' }), side: 'top', label: 'Row count', text: 'The number of rows currently shown.' },
      { find: (p) => p.getByRole('button', { name: 'Export CSV' }), side: 'top', label: 'Export CSV', text: 'Downloads the rows currently shown.' },
      { find: (p) => p.locator('thead th').nth(2), side: 'bottom', label: 'Sort and definitions', text: 'Click a column heading to sort by it; click again to reverse. Hover the small “?” for the definition of the column.' },
      { find: (p) => p.locator('tbody tr').first().locator('td').last(), side: 'bottom', label: 'Reference', text: 'Opens the source publication. A dash means the source did not report that value.' },
    ],
  },
  {
    id: 'statistics', title: 'Statistics', url: '/statistics', height: 1060,
    prep: async (p) => { await p.getByText('QTL by trait').first().waitFor({ timeout: 90000 }); await p.evaluate(() => window.scrollTo(0, 250)) },
    intro: 'The Statistics page summarises what the database holds. All numbers are computed from the current data when the page opens.',
    callouts: [
      { find: (p) => p.locator('.card', { hasText: 'QTL / MTA records' }).first(), side: 'top', label: 'Totals', text: 'QTL, MetaQTL, epistatic QTL pairs and source publications.' },
      { find: (p) => p.locator('tr', { hasText: 'Abiotic stress' }).first(), side: 'left', label: 'Main traits', text: 'The five main traits with their totals. The bar length is proportional to the number of QTL.' },
      { find: (p) => p.locator('tr', { hasText: 'Drought tolerance' }).first(), side: 'left', label: 'Sub-categories', text: 'Each sub-category with its count and its share of all records. The rows add up to the total.' },
    ],
  },
  {
    id: 'statistics-charts', title: 'Statistics: charts', url: '/statistics', height: 1080,
    prep: async (p) => { await p.getByRole('heading', { name: 'QTL by chromosome' }).waitFor({ timeout: 90000 }); await p.waitForTimeout(2500); await p.getByRole('heading', { name: 'QTL by chromosome' }).scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -80)); await p.locator('.js-plotly-plot').first().hover() },
    intro: 'Below the trait table are charts by chromosome and publication year, and summaries of position type, species and literature coverage.',
    callouts: [
      { find: (p) => p.locator('section', { hasText: 'QTL by chromosome' }).locator('.js-plotly-plot'), side: 'left', label: 'QTL by chromosome', text: 'Bars are coloured by subgenome (A, B, D). Hover a bar to read its exact value.' },
      { find: (p) => p.locator('.modebar').first(), side: 'top', label: 'Save a chart', text: 'Hover a chart and click the camera icon to save it as a high-resolution PNG.' },
      { find: (p) => p.locator('section', { hasText: 'QTL by publication year' }).locator('.js-plotly-plot'), side: 'right', label: 'QTL by publication year', text: 'The year of the study each QTL came from.' },
      { find: (p) => p.getByRole('heading', { name: 'Type of map position' }), side: 'left', label: 'Type of map position', text: 'How many QTL have a physical position, a genetic position only, or none.' },
    ],
  },
  {
    id: 'map-circos', title: 'Genome map: Circos view', url: '/map', height: 1500,
    prep: async (p) => { await p.getByText('Circos genome view').waitFor({ timeout: 120000 }); await p.evaluate(() => window.scrollTo(0, 290)); await p.waitForTimeout(1200) },
    intro: 'The Map page draws QTL and MetaQTL on the wheat genome. The Circos view shows all 21 chromosomes in a circle.',
    callouts: [
      { find: (p) => p.getByText('Show QTLs'), side: 'top', label: 'Layers', text: 'Switch QTL, MetaQTL, GWAS Atlas associations and epistatic links on or off.' },
      { find: (p) => p.getByRole('button', { name: 'Circos', exact: true }), side: 'top', label: 'Choose the view', text: 'Ideogram and Circos show QTL with a physical position; Linkage (cM) shows QTL mapped only on a genetic map.' },
      { find: (p) => p.getByRole('button', { name: 'PNG' }), side: 'top', label: 'Export', text: 'Save the current view as SVG, PNG or JPEG. PNG and JPEG are saved at print resolution.' },
      { find: (p) => p.getByPlaceholder('Search name, trait, parameter or candidate gene…'), side: 'left', label: 'Search the map', text: 'Shows only the QTL whose name, trait, parameter or candidate gene matches.' },
      { find: (p) => p.getByText('A genome', { exact: true }), side: 'right', label: 'Subgenome', text: 'Limit the view to the A, B or D subgenome.' },
      { find: (p) => p.getByRole('button', { name: 'Fungal resistance' }).first(), side: 'left', label: 'Highlight traits', text: 'Click one or several traits to show only those. The colours here are the colours used in the plot.' },
      { find: (p) => p.locator('svg').filter({ has: p.locator('text', { hasText: 'WheatQTLdb V3.0' }) }), side: 'left', label: 'The plot', text: 'Outer ring: chromosomes. Next ring: QTL density. Inner rings: one ring per trait for MetaQTL and for QTL. Hover any mark for its details.' },
    ],
  },
  {
    id: 'map-ideogram', title: 'Genome map: Ideogram view', url: '/map', height: 1250,
    prep: async (p) => { await p.getByText('Circos genome view').waitFor({ timeout: 120000 }); await p.getByRole('button', { name: 'Ideogram', exact: true }).click(); await p.waitForTimeout(2500); await p.evaluate(() => window.scrollTo(0, 620)); await p.waitForTimeout(800) },
    intro: 'The Ideogram view lays the chromosomes side by side, each at its true physical length.',
    callouts: [
      { find: (p) => p.locator('svg').filter({ has: p.locator('text', { hasText: '7D' }) }).last(), side: 'left', label: 'Chromosomes', text: 'Height is proportional to physical length; the pinch marks the centromere. The strip beside each chromosome shows QTL density, coloured by the most frequent trait, and the brackets are MetaQTL intervals.' },
    ],
  },
  {
    id: 'map-linkage', title: 'Genome map: Linkage (cM) view', url: '/map', height: 1250,
    prep: async (p) => { await p.getByText('Circos genome view').waitFor({ timeout: 120000 }); await p.getByRole('button', { name: 'Linkage (cM)', exact: true }).click(); await p.waitForTimeout(2500); await p.evaluate(() => window.scrollTo(0, 560)); await p.waitForTimeout(800) },
    intro: 'Many QTL were published with a genetic-map position only. They cannot be placed on the physical views, so they are drawn here on a centimorgan scale.',
    callouts: [
      { find: (p) => p.getByText('placed by genetic position'), side: 'left', label: 'How many are shown', text: 'The number of QTL drawn by their genetic position.' },
      { find: (p) => p.locator('svg[aria-label^="QTL positions on the genetic"]'), side: 'left', label: 'cM scale', text: 'Each strip is a 5 cM window: its length shows how many QTL were reported there and its colour the most frequent trait. Positions are as published, each on its own study’s map.' },
    ],
  },
  {
    id: 'linkage-maps', title: 'Linkage maps', url: '/data/linkage-maps', height: 1180,
    prep: async (p) => { await p.getByText('Viewable (marker order)').waitFor({ timeout: 90000 }); await p.waitForTimeout(1500); await p.evaluate(() => window.scrollTo(0, 250)) },
    intro: 'Genetic maps behind the mapped QTL: the GrainGenes catalogue plus maps whose marker positions can be viewed here.',
    callouts: [
      { find: (p) => p.locator('.card', { hasText: 'Viewable (marker order)' }).first(), side: 'top', label: 'Viewable maps', text: 'How many of the catalogued maps can be drawn with their marker positions.' },
      { find: (p) => p.locator('svg').filter({ has: p.locator('text', { hasText: '7D' }) }).first(), side: 'left', label: 'Map viewer', text: 'One bar per linkage group; shading shows marker density. Click a group to list its markers.' },
      { find: (p) => p.locator('select').first(), side: 'left', label: 'Choose a map', text: 'Maps with marker positions are listed first; the others are catalogue records with a link to GrainGenes.' },
    ],
  },
  {
    id: 'publications', title: 'Publications', url: '/publications', height: 900,
    prep: async (p) => { await p.getByText('With full metadata').waitFor({ timeout: 90000 }); await p.evaluate(() => window.scrollTo(0, 250)) },
    intro: 'Every study behind a record, with its title, authors, journal, year and the number of records it contributed.',
    callouts: [
      { find: (p) => p.locator('.card', { hasText: 'Years covered' }).first(), side: 'top', label: 'Summary', text: 'The number of publications and the years they span.' },
      { find: (p) => p.locator('select').first(), side: 'bottom', label: 'Decade', text: 'Show only the publications of one decade.' },
      { find: (p) => p.locator('tbody tr').first().locator('td').nth(1), side: 'bottom', label: 'Title', text: 'Opens the publication. The Records column shows how many records came from it.' },
    ],
  },
  {
    id: 'candidate-genes', title: 'Candidate genes', url: '/data/candidate-genes', height: 860,
    prep: async (p) => { await p.getByRole('button', { name: 'Export CSV' }).waitFor({ timeout: 90000 }); await p.evaluate(() => window.scrollTo(0, 200)) },
    intro: 'Genes proposed as underlying a QTL, each with the link that suits its identifier.',
    callouts: [
      { find: (p) => p.locator('thead th', { hasText: 'Identifier' }), side: 'top', label: 'Kind of identifier', text: 'Says whether the entry is a gene symbol, an annotation gene model or a functional description.' },
      { find: (p) => p.locator('tbody tr').first().locator('td').last(), side: 'left', label: 'Resources', text: 'Gene symbols open in GrainGenes; gene models open in Ensembl Plants; a position opens the genome browser at that location.' },
    ],
  },
  {
    id: 'pending', title: 'Studies awaiting curation and News', url: '/data/pending-studies', height: 820,
    prep: async (p) => { await p.getByText('candidate papers').waitFor({ timeout: 90000 }); await p.evaluate(() => window.scrollTo(0, 200)) },
    intro: 'Papers found by a literature search that are not yet in the database. They are listed so that curators, and users, can see what is still to come; no QTL has been taken from them. New data and features are announced on the News page.',
    callouts: [
      { find: (p) => p.getByText('Only papers naming QTL / GWAS in the title'), side: 'bottom', label: 'Strongest candidates', text: 'Tick to show only papers whose title reports QTL or GWAS work.' },
      { find: (p) => p.locator('label', { hasText: 'Study type' }).locator('select'), side: 'bottom', label: 'Study type', text: 'QTL mapping, GWAS, meta-QTL or epistatic QTL.' },
      { find: (p) => p.getByRole('link', { name: 'News' }).first(), side: 'bottom', label: 'News', text: 'Opens the list of data releases and new features.' },
    ],
  },
]

;(async () => {
  fs.mkdirSync(RAW, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.CHROME })
  const out = []
  for (const [i, s] of SECTIONS.entries()) {
    const page = await browser.newPage({ viewport: { width: W, height: s.height }, deviceScaleFactor: SCALE })
    await page.goto(BASE + s.url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    if (s.prep) await s.prep(page)
    await page.waitForTimeout(600)
    const file = `${String(i + 1).padStart(2, '0')}-${s.id}.png`
    const callouts = []
    for (const c of s.callouts) {
      let box = null
      try { box = await c.find(page).first().boundingBox({ timeout: 5000 }) } catch (e) { /* reported below */ }
      const visible = box && box.y + box.height > 0 && box.y < s.height && box.width > 0
      if (!visible) { console.log(`  ! ${s.id}: "${c.label}" not on screen - left out`); continue }
      callouts.push({ n: callouts.length + 1, label: c.label, text: c.text, side: c.side, box })
    }
    await page.screenshot({ path: path.join(RAW, file) })
    await page.close()
    out.push({ id: s.id, title: s.title, intro: s.intro, image: file, width: W * SCALE, height: s.height * SCALE, scale: SCALE, callouts })
    console.log(`${file}  ${callouts.length}/${s.callouts.length} callouts`)
  }
  await browser.close()
  fs.writeFileSync(path.join(RAW, 'sections.json'), JSON.stringify(out, null, 2))
})().catch((e) => { console.error(e); process.exit(1) })
