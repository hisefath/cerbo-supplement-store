---
learning: check-versions-in-the-registry
date: 2026-10-10
project: cerbo-supplement-store
finding: F10
proposal: H9
layer: Skill
status: proposed
---

# Every version named in a design decision cites a registry check run that day.

## What happened

design-lld recommended "Nuxt 3" in D38, and G3 approved it. Before the first install, a check of the npm registry
showed Nuxt 4 was the current major and Nuxt 3 the previous one. The human revised D38 to Nuxt 4 (journal D44) before
any code was written. The cost was one gate Revise; if nobody had checked, it would have been a framework migration
later.

## Why it happened

1. The decision named a version that was no longer current.
2. The model wrote the version it remembered, and model memory lags new major releases.
3. Harness gap: neither design-hld nor design-lld asked for evidence that a named version is current, so nothing
   failed when the evidence was missing.

## The rule now

A decision that names a language, framework or database version cites the registry command that proves it is
current (e.g. `npm view nuxt dist-tags`) and the date it was run.
- Enforced by: the design-hld and design-lld Done-when check proposed in H9 (see the frontmatter status).
- Interview line: "The AI suggested Nuxt 3 from memory; my design step now has to cite the registry, so I caught that
  4 was current before writing any code."

## Evidence

- TRACKER Log 2026-10-10 11:30 CDT FAIL design-lld; TRACKER Approvals 2026-10-10 11:30 CDT G3 Revise D38 ("a")
- Guard: the H9 awk prints `### D38 Web framework for the one deployable` on `docs/architecture/lld.md` today and
  nothing for a decision that cites `npm view`
- Factory record: `FINDINGS.md` F10, `HARNESS_CHANGELOG.md` H9
