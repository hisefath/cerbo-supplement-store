// screens.md S8 Error: which sentence the sign-in page shows after a failed sign-in. A request with no answer is only
// "offline" when the browser says so; otherwise the server was unreachable for a moment, which is our failure.
export function signInErrorMessage(f: { status?: number; online: boolean; title?: string }): string {
  if (f.status === 401 || f.status === 422) return "That email and password don't match. Check them and try again."
  if (f.status === 429) return f.title ?? 'Too many tries'
  if (f.status || f.online) return "We couldn't sign you in right now. Try again in a moment."
  return "You're offline. Try again when you're back online."
}
