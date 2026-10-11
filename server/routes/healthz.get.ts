// GET /healthz (docs/ops/HEALTH.md §1, M4-T901): 200 "ok" after one `select 1` within 2 s, else 503 "unavailable".
// No auth, no-store, and nothing about versions, errors or config in the body; a failure logs only errorFacts.
// M6 (EP-40, D87): a success also records its 5-minute slot, unawaited, so the ping never delays or fails the answer (FM-8).
import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3'
import { sql } from 'kysely'
import { recordPing } from '../services/request-metrics'
import { useDb } from '../utils/db'
import { errorFacts } from '../utils/problem'

class HealthTimeout extends Error {}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // ponytail: a timed-out query keeps its pool connection until PostgreSQL answers; add statement_timeout if that bites.
    await Promise.race([
      sql`select 1`.execute(useDb()),
      new Promise((_, reject) => (timer = setTimeout(() => reject(new HealthTimeout()), 2000))),
    ])
    void recordPing()
    return 'ok'
  } catch (err) {
    console.error('healthz: database unavailable', errorFacts(err))
    setResponseStatus(event, 503)
    return 'unavailable'
  } finally {
    clearTimeout(timer)
  }
})
