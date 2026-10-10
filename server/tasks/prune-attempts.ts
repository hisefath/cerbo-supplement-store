// SEC-11: sign-in (EP-15) and payment (EP-23) attempt rows are kept only for the 15-minute rate-limit window. The
// services prune on each attempt; this Nitro scheduled task (nuxt.config.ts scheduledTasks) prunes even when nobody
// signs in or pays.
import { now } from '../services/clock'
import { useDb } from '../utils/db'

const WINDOW_MS = 15 * 60 * 1000

export default defineTask({
  meta: { name: 'prune-attempts', description: 'Delete sign-in and payment attempts older than 15 minutes' },
  async run() {
    const db = useDb()
    const since = new Date(now().getTime() - WINDOW_MS)
    await db.deleteFrom('sign_in_attempts').where('attempted_at', '<=', since).execute()
    await db.deleteFrom('pay_rate_attempts').where('attempted_at', '<=', since).execute()
    return { result: 'ok' }
  },
})
