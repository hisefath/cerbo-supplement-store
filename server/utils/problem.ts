// RFC 9457 problem details (lld.md §4 Problem types). Services throw ProblemError; defineApiHandler turns it into an
// application/problem+json response, and any unexpected error into /problems/internal.
import { randomUUID } from 'node:crypto'
import { defineEventHandler, readBody, setResponseHeader, setResponseStatus, type EventHandlerRequest, type H3Event } from 'h3'
import type { ZodError, ZodType } from 'zod'

const TITLES = {
  validation: [422, 'Some fields are invalid'],
  unauthenticated: [401, 'Please sign in'],
  forbidden: [403, "You can't open this"],
  'not-found': [404, "We can't find this"],
  'sign-in-failed': [401, "That email and password don't match"],
  'rate-limited': [429, 'Too many tries'],
  'idempotency-key-missing': [400, 'Idempotency-Key is required'],
  'idempotency-in-flight': [409, 'This request is still being processed'],
  'idempotency-mismatch': [422, 'This key was used for a different request'],
  'invalid-transition': [409, "This order can't do that now"],
  'checkout-expired': [409, 'Your price hold ended'],
  'below-price-floor': [422, 'That price is below the lowest allowed'],
  'insufficient-stock': [422, 'Not enough in stock'],
  'order-under-review': [422, "We couldn't complete this payment"],
  'payment-failed': [502, "Your payment didn't go through. No money was taken."],
  'stale-price': [409, 'This price changed a moment ago'],
  'stale-stock': [409, 'Stock changed while you were here'],
  'stale-role': [409, "This person's role changed a moment ago"],
  'self-role-change': [403, "You can't change your own role"],
  'last-finance-lead': [422, 'No one would be able to run financial reports'],
  internal: [500, 'Something went wrong on our side'],
} satisfies Record<string, [number, string]>

export type ProblemSlug = keyof typeof TITLES

export class ProblemError extends Error {
  constructor(
    public readonly slug: ProblemSlug,
    public readonly extensions: Record<string, unknown> = {},
  ) {
    super(slug)
  }
}

export function validationProblem(err: ZodError): ProblemError {
  return new ProblemError('validation', {
    errors: err.issues.map((i) => ({ pointer: '#/' + i.path.join('/'), detail: i.message })),
  })
}

/** The JSON body parsed by `schema`, or 422 /problems/validation (also for a body that is not JSON). */
export async function parseBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const raw = await readBody(event).catch(() => undefined)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw validationProblem(parsed.error)
  return parsed.data
}

function sendProblem(event: H3Event, slug: ProblemSlug, extensions: Record<string, unknown> = {}) {
  const [status, title] = TITLES[slug]
  setResponseStatus(event, status)
  setResponseHeader(event, 'content-type', 'application/problem+json')
  return { type: `/problems/${slug}`, title, status, ...extensions }
}

export function defineApiHandler<T>(fn: (event: H3Event<EventHandlerRequest>) => Promise<T>) {
  // The problem body is typed as T so the route's typed response (useFetch data) stays the success shape.
  return defineEventHandler(async (event): Promise<T> => {
    try {
      return await fn(event)
    } catch (err) {
      if (err instanceof ProblemError) return sendProblem(event, err.slug, err.extensions) as T
      const instance = `urn:uuid:${randomUUID()}`
      console.error('unexpected error', instance, err)
      return sendProblem(event, 'internal', { instance }) as T
    }
  })
}
