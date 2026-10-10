// QA-owned by define-acceptance (specs/M4-tracer-bullet/acceptance.md). Do not edit; report a wrong test in result.md ## Questions.
//
// Calls the running app the way a browser does: same-origin JSON with the session cookie (EP-15 sets it).
import { randomUUID } from 'node:crypto'
import { fetch } from '@nuxt/test-utils/e2e'
import { PASSWORD } from './people'

export interface Reply {
  status: number
  type: string
  body: any
  text: string
  headers: Headers
}

export async function call(
  path: string,
  opts: { method?: string; cookie?: string; body?: unknown; key?: string | null; redirect?: RequestRedirect } = {},
): Promise<Reply> {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (opts.cookie) headers.cookie = opts.cookie
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  if (opts.key) headers['idempotency-key'] = opts.key
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    redirect: opts.redirect ?? 'manual',
  })
  const text = await res.text()
  let body: any = undefined
  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    body = undefined
  }
  return { status: res.status, type: res.headers.get('content-type') ?? '', body, text, headers: res.headers }
}

// Signs in through EP-15 and returns the session cookie; fails loudly if sign-in does not work.
export async function signIn(email: string, password = PASSWORD): Promise<string> {
  const r = await call('/api/session', { method: 'POST', body: { email, password } })
  if (r.status !== 200) throw new Error(`sign-in for ${email} returned ${r.status}: ${r.text.slice(0, 200)}`)
  const cookies = r.headers.getSetCookie().map((c) => c.split(';')[0])
  const session = cookies.find((c) => c.startsWith('session='))
  if (!session) throw new Error(`sign-in for ${email} set no "session" cookie`)
  return session
}

export const newKey = (): string => randomUUID()

export function expectProblem(r: Reply, status: number, slug: string): void {
  if (r.status !== status || !r.type.includes('application/problem+json') || r.body?.type !== `/problems/${slug}`) {
    throw new Error(
      `expected ${status} application/problem+json /problems/${slug}, got ${r.status} ${r.type} ${r.text.slice(0, 200)}`,
    )
  }
}
