// EP-15 POST /api/session (signIn): checks email and password, sets the session cookie, returns Me.
import { z } from 'zod'
import { clientAddress, setSessionCookie, signIn, toMe } from '../../services/session'
import { defineApiHandler, parseBody } from '../../utils/problem'

const SignInRequest = z.strictObject({ email: z.email(), password: z.string().min(1) })

export default defineApiHandler(async (event) => {
  const body = await parseBody(event, SignInRequest)
  const { viewer, cookieToken } = await signIn(body.email, body.password, clientAddress(event))
  setSessionCookie(event, cookieToken)
  return toMe(viewer)
})
