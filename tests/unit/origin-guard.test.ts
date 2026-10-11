// BE-23 isCrossSiteWrite (NFR-017, D91).
import { describe, expect, it } from 'vitest'
import { isCrossSiteWrite } from '../../server/middleware/origin-guard'

const H = 'web.example.test'
describe('isCrossSiteWrite', () => {
  it('refuses a write whose Origin is another host', () => {
    expect(isCrossSiteWrite('POST', '/api/orders/1/checkout', 'https://evil.example', undefined, H)).toBe(true)
    expect(isCrossSiteWrite('PUT', '/api/practice/prices/1', `https://${H}.evil.example`, undefined, H)).toBe(true)
    expect(isCrossSiteWrite('DELETE', '/api/session', 'null', undefined, H)).toBe(true)
  })
  it('refuses a write the browser marks cross-site, even with no Origin', () => {
    expect(isCrossSiteWrite('POST', '/api/orders', undefined, 'cross-site', H)).toBe(true)
  })
  it('lets same-origin writes, reads, non-API paths and header-less clients through', () => {
    expect(isCrossSiteWrite('POST', '/api/orders', `https://${H}`, 'same-origin', H)).toBe(false)
    expect(isCrossSiteWrite('GET', '/api/orders', 'https://evil.example', 'cross-site', H)).toBe(false)
    expect(isCrossSiteWrite('POST', '/sign-in', 'https://evil.example', undefined, H)).toBe(false)
    expect(isCrossSiteWrite('POST', '/api/orders', undefined, undefined, H)).toBe(false)
    expect(isCrossSiteWrite('POST', '/api/orders', undefined, 'same-site', H)).toBe(false)
  })
})
