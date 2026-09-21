// Renders every chart on the Statistics page to a JPEG in figures/statistics/.
//
// Drives a headless Chrome over the DevTools protocol and clicks the page's
// own JPEG buttons, so the files are byte-for-byte what a visitor downloads
// (same palette, same 2x rasterisation) instead of a second, drifting
// plotting implementation of the same CSVs.
//
// Run: npm run dev            (or npm run preview, in another shell)
//      node scripts/render_statistics_jpegs.mjs [--url http://localhost:5173] [--out figures/statistics]
//
// Needs Node >= 22 (global WebSocket) and a `google-chrome` binary.

import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}

const BASE_URL = arg('url', 'http://localhost:5173')
const OUT_DIR = resolve(arg('out', 'figures/statistics'))
const CHROME = process.env.CHROME_BIN || 'google-chrome'
const PORT = 9333
const VIEWPORT = { width: 1600, height: 1200 }

class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      const resolvePending = this.pending.get(msg.id)
      if (resolvePending) {
        this.pending.delete(msg.id)
        resolvePending(msg)
      }
    })
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true })
      ws.addEventListener('error', rej, { once: true })
    })
    return new CDP(ws)
  }

  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((res, rej) => {
      this.pending.set(id, (msg) => (msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result)))
    })
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.text)
    return result.value
  }
}

async function chromeTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      return (await res.json()).webSocketDebuggerUrl
    } catch {
      await sleep(200)
    }
  }
  throw new Error('Chrome did not expose a DevTools endpoint')
}

const profile = mkdtempSync(join(tmpdir(), 'wheatqtldb-render-'))
mkdirSync(OUT_DIR, { recursive: true })

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
  '--no-first-run',
  '--disable-gpu',
  'about:blank',
], { stdio: 'ignore' })

try {
  const browser = await CDP.connect(await chromeTarget())
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' })
  const page = await CDP.connect(`ws://127.0.0.1:${PORT}/devtools/page/${targetId}`)

  await page.send('Page.enable')
  await page.send('Runtime.enable')
  await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT_DIR })
  await page.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false })

  await page.send('Page.navigate', { url: `${BASE_URL}/statistics` })
  // The charts only mount once the three CSVs have parsed.
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate("document.querySelectorAll('svg.recharts-surface').length")
    if (ready >= 10) break
    await sleep(500)
  }

  const titles = await page.evaluate(
    "JSON.stringify([...document.querySelectorAll('button[title$=\\\" as JPEG\\\"]')].map((b) => b.title))"
  )
  const count = JSON.parse(titles).length
  if (!count) throw new Error('No JPEG export buttons found - is the dev server serving this branch?')

  for (let i = 0; i < count; i++) {
    await page.evaluate(`document.querySelectorAll('button[title$=" as JPEG"]')[${i}].click()`)
    await sleep(500)
  }
  await sleep(2000)

  console.log(`${readdirSync(OUT_DIR).filter((f) => f.endsWith('.jpeg')).length} JPEGs written to ${OUT_DIR}`)
} finally {
  chrome.kill()
  await sleep(500)
  rmSync(profile, { recursive: true, force: true, maxRetries: 5 })
}
