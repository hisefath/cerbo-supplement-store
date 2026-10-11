// Nuxt 4 app shell (journal D44). Pages and server routes arrive with the M4 tasks.
import { createHash, randomUUID } from 'node:crypto'

// One id per build, fixed here so the one inline script Nuxt renders (its runtime config) is known at build time and
// the CSP can allow exactly that script by hash instead of 'unsafe-inline'.
const buildId = randomUUID()
// ponytail: this mirrors Nuxt's renderPayloadJsonScript for an empty public runtime config and the default app paths.
// Adding public runtime config or NUXT_APP_* overrides changes the script: update this string, or client JS is blocked.
export const NUXT_CONFIG_SCRIPT = `window.__NUXT__={};window.__NUXT__.config={public:{},app:{baseURL:"/",buildId:"${buildId}",buildAssetsDir:"/_nuxt/",cdnURL:""}}`
const configScriptHash = `'sha256-${createHash('sha256').update(NUXT_CONFIG_SCRIPT).digest('base64')}'`

// SEC-4: sent on every response. Scripts and styles come from the app's own origin (plus the one config script above).
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' ${configScriptHash}`,
    "style-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

// SEC-8: order, session and operations data is never kept by a shared browser or proxy.
const NO_STORE = { headers: { 'Cache-Control': 'no-store' } }

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  devtools: { enabled: false },
  buildId,
  // Theme (lld.md §3, D81): one global stylesheet; its fonts are bundled under /_nuxt/, so style-src 'self' holds.
  css: ['~/assets/css/theme.css'],
  // No other inline script or style, so the CSP needs no 'unsafe-inline': CSS ships as files, no inline import map.
  features: { inlineStyles: false },
  experimental: { entryImportMap: false },
  // Every build sends them. The dev server injects scripts and styles inline (Vite HMR), so `npm run dev` goes without.
  $production: { routeRules: { '/**': { headers: SECURITY_HEADERS } } },
  routeRules: {
    '/api/**': NO_STORE,
    '/orders/**': NO_STORE, // S2
    '/ops/**': NO_STORE, // S3, S4
  },
  nitro: {
    // SEC-11: server/tasks/prune-attempts.ts deletes rate-limit rows older than 15 minutes, even with no traffic.
    experimental: { tasks: true },
    scheduledTasks: { '*/15 * * * *': ['prune-attempts'] },
  },
})
