// EP-16 DELETE /api/session (signOut): ends the signed-in session and clears its cookie; 401 when nobody is signed in.
import { getCookie, setResponseStatus } from 'h3'
import { clearSessionCookie, requireViewer, SESSION_COOKIE, signOut } from '../../services/session'
import { defineApiHandler } from '../../utils/problem'

export default defineApiHandler(async (event) => {
  await requireViewer(event)
  await signOut(getCookie(event, SESSION_COOKIE) ?? '')
  clearSessionCookie(event)
  setResponseStatus(event, 204)
  return null
})
