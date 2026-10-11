// The sign-in page's error line (screens.md S8 Error): a wrong email or password says so; the network is blamed only
// when the browser itself reports it is offline (bug: a wrong password showed "You're offline").
import { describe, expect, it } from 'vitest'
import { signInErrorMessage } from '../../app/utils/sign-in-error'

const MISMATCH = "That email and password don't match. Check them and try again."
const OURS = "We couldn't sign you in right now. Try again in a moment."
const OFFLINE = "You're offline. Try again when you're back online."

describe('signInErrorMessage', () => {
  it('a wrong email or password (401, 422) says they do not match', () => {
    expect(signInErrorMessage({ status: 401, online: true })).toBe(MISMATCH)
    expect(signInErrorMessage({ status: 422, online: true })).toBe(MISMATCH)
  })
  it('too many tries shows the server title', () => {
    expect(signInErrorMessage({ status: 429, online: true, title: 'Too many tries' })).toBe('Too many tries')
  })
  it('a server failure is ours', () => {
    expect(signInErrorMessage({ status: 500, online: true })).toBe(OURS)
  })
  it('no answer while the browser is online is ours, never "offline"', () => {
    expect(signInErrorMessage({ status: undefined, online: true })).toBe(OURS)
  })
  it('no answer while the browser reports offline says offline', () => {
    expect(signInErrorMessage({ status: undefined, online: false })).toBe(OFFLINE)
  })
})
