// Every PascalCase tag in an app template must be a component Nuxt registered (.nuxt/components.d.ts, written by
// `nuxi prepare` / typecheck), a Vue or Nuxt built-in, or a local import. An unknown tag renders as nothing: the
// paid-order receipt was blank because the page used <ReceiptView> while Nuxt registered <CheckoutReceiptView>.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const BUILT_IN = ['NuxtLink', 'NuxtPage', 'NuxtLayout', 'NuxtLoadingIndicator', 'ClientOnly', 'Teleport', 'Transition', 'TransitionGroup', 'KeepAlive', 'Suspense', 'Component']
const vueFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? vueFiles(join(dir, f)) : f.endsWith('.vue') ? [join(dir, f)] : []))

describe('component tags resolve', () => {
  it('every PascalCase template tag is a registered, built-in or imported component', () => {
    const registered = [...readFileSync('.nuxt/components.d.ts', 'utf8').matchAll(/export const (\w+)/g)].map((m) => m[1])
    expect(registered.length).toBeGreaterThan(10)
    const unknown: string[] = []
    for (const file of vueFiles('app')) {
      const src = readFileSync(file, 'utf8')
      const template = src.slice(src.indexOf('<template>'), src.lastIndexOf('</template>'))
      const imported = [...src.matchAll(/import\s+(\w+)\s+from/g)].map((m) => m[1])
      for (const [, tag] of template.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g))
        if (![...registered, ...BUILT_IN, ...imported].includes(tag!)) unknown.push(`${file}: <${tag}>`)
    }
    expect(unknown).toEqual([])
  })
})
