// BE-20 Clock (lld.md §2, SEAM-1): the current UTC time for every component, so tests can freeze and step it.
let frozen: Date | null = null

export const now = (): Date => (frozen ? new Date(frozen) : new Date())

/** Test seam: freeze the clock at `at` (call again to step it), or pass null to follow the system time again. */
export function freezeClock(at: Date | null): void {
  frozen = at
}
