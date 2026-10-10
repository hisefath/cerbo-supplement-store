// EP-17 GET /api/session (getSession): who is signed in; 401 once idle 15 minutes.
import { requireViewer, toMe } from '../../services/session'
import { defineApiHandler } from '../../utils/problem'

export default defineApiHandler(async (event) => toMe(await requireViewer(event)))
