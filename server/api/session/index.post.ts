// EP-15 POST /api/session (signIn): checks email and password, sets the session cookie, returns Me.
import { getRequestIP } from 'h3'
import { z } from 'zod'
import { setSessionCookie, signIn, toMe } from '../../services/session'
import { defineApiHandler, parseBody } from '../../utils/problem'

const SignInRequest = z.strictObject({ email: z.email(), password: z.string().min(1) })

export default defineApiHandler(async (event) => {
  const body = await parseBody(event, SignInRequest)
  const { viewer, cookieToken } = await signIn(body.email, body.password, getRequestIP(event) ?? '')
  setSessionCookie(event, cookieToken)
  return toMe(viewer)
})
