// BE-19 wiring (lld.md §2, SEQ-12): note each request's start, and after the response count it under its route group
// (never an id: BE-19.routeGroup). `record` is not awaited and never rejects, so stats can't fail a request (FM-8).
import { defineNitroPlugin } from 'nitropack/runtime'
import { record, routeGroup } from '../services/request-metrics'

const EP23 = /^\/api\/orders\/[^/]+\/payments$/

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', (event) => {
    event.context.metricsStart = performance.now()
  })
  nitro.hooks.hook('afterResponse', (event) => {
    const start = event.context.metricsStart as number | undefined
    const path = event.path.split('?')[0]!
    const group = routeGroup(path)
    if (start === undefined || !group) return
    // D86: a Pay refused for stock is one stock refusal (BE-1 left the slug on event.context.problem).
    const refusal = event.method === 'POST' && EP23.test(path) && event.context.problem === 'insufficient-stock'
    void record(group, event.node.res.statusCode, performance.now() - start, refusal)
  })
})
