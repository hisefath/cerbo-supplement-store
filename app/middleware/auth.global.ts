// BE-2 PageGuards (lld.md §2, SEQ-7 steps 1-2): every page except sign-in (EP-1) and the order notice (EP-2) needs a
// live session. Signed out: 303 to /sign-in?next=<the page asked for> and none of the page's contents (FR-040). The
// server's 15-minute rule decides (BE-3 via EP-17); a session that existed and ended adds `idle=1`, so the sign-in
// page explains it (FR-041). A session check that fails for any other reason also goes to sign-in (fail closed).
// Wrong roles are refused by each page's own API call (BE-4) and shown as that page's Permission denied state.
const PUBLIC = [/^\/sign-in$/, /^\/notices\/[^/]+$/]
const BASE = 'http://same-site.invalid'

/** `next` when it is a path on this site, else null. Parsed as a browser would ("/\t/x" is "//x"), so no off-site
 *  redirect: "/orders/1001" yes; "//evil.example", "/\evil.example", "/\t/evil.example", "https://…" no. */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/')) return null
  let url: URL
  try {
    url = new URL(next, BASE)
  } catch {
    return null
  }
  const path = url.pathname + url.search + url.hash
  return url.origin === BASE && !path.startsWith('//') ? path : null
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC.some((p) => p.test(to.path))) return
  const hadSession = import.meta.server ? !!useCookie('session').value : !!useNuxtData('viewer').data.value
  try {
    await useRequestFetch()('/api/session')
  } catch (err) {
    const idle = hadSession && (err as { statusCode?: number })?.statusCode === 401
    return navigateTo({ path: '/sign-in', query: { next: to.fullPath, ...(idle ? { idle: '1' } : {}) } }, { redirectCode: 303 })
  }
})
