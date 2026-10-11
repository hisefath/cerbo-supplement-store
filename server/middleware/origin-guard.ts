// BE-23 OriginGuard (NFR-017, D91): a write to /api whose Origin names another host, or whose Sec-Fetch-Site says
// cross-site, is refused 403 before any handler runs. No Origin and Sec-Fetch-Site not cross-site (server-to-server) passes.
import { getRequestHeader, getRequestHost } from 'h3'
import { defineApiHandler, ProblemError } from '../utils/problem'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isCrossSiteWrite(method: string, path: string, origin: string | undefined, fetchSite: string | undefined, host: string): boolean {
  if (SAFE.has(method.toUpperCase()) || !path.startsWith('/api/')) return false
  if (fetchSite === 'cross-site') return true
  if (!origin) return false
  try {
    return new URL(origin).host !== host.toLowerCase().replace(/:(443|80)$/, '')
  } catch {
    return true // "null" or garbage is not our page
  }
}

export default defineApiHandler(async (event) => {
  const h = (name: string) => getRequestHeader(event, name)
  if (isCrossSiteWrite(event.method, event.path, h('origin'), h('sec-fetch-site'), getRequestHost(event, { xForwardedHost: true })))
    throw new ProblemError('forbidden')
})
