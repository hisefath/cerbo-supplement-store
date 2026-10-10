// M4-T902 GET /version (docs/ops/HEALTH.md §1): which build is running, from the build-info.json that deploy.md DEP-2
// writes at the application root (the working directory `node .output/server/index.mjs` starts in). No auth.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineEventHandler, setResponseHeader, setResponseStatus } from 'h3'

type BuildInfo = { commit: string; built_at: string }
let known: BuildInfo | undefined // read once; a miss is re-checked so local dev never caches "unknown"

async function readBuildInfo(): Promise<BuildInfo | undefined> {
  try {
    const { commit, built_at } = JSON.parse(await readFile(join(process.cwd(), 'build-info.json'), 'utf8'))
    const valid = /^[0-9a-f]{40}$/.test(commit) && typeof built_at === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(built_at)
    return valid ? { commit, built_at } : undefined // only these two fields, never the file's others
  } catch {
    return undefined
  }
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  known ??= await readBuildInfo()
  if (known) return known
  setResponseStatus(event, 503)
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return 'unknown build'
})
