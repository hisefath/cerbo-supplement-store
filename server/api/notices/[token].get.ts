// EP-24 GET /api/notices/{token} (getNotice): public; the practice name and where to sign in, nothing else (FR-044).
import { getRouterParam } from 'h3'
import { getNotice } from '../../services/messaging'
import { defineApiHandler } from '../../utils/problem'

export default defineApiHandler(async (event) => getNotice(getRouterParam(event, 'token') ?? ''))
