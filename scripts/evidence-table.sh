#!/usr/bin/env bash
# Prints a markdown evidence table: one row per FR-### in docs/product/prd.md,
# with its milestone(s) from the PRD "Milestone cut", the acceptance tests whose
# Traceability "Covers" column names it, and the test files that hold those tests.
# Usage: bash scripts/evidence-table.sh   (run from anywhere; no dependencies)
set -euo pipefail
cd "$(dirname "$0")/.."

prd=docs/product/prd.md
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

# FR id -> milestone, from the "## Milestone cut" table (col 2 = milestone, col 4 = FR scope).
awk -F'|' '/^## Milestone cut/{p=1;next} /^## /{p=0}
  p && /^\| (M[0-9]|Later)/ {
    split($2, m, " "); n = split($4, w, /[^A-Z0-9-]+/)
    for (i = 1; i <= n; i++) if (w[i] ~ /^FR-[0-9]+$/) print w[i] "\t" m[1]
  }' "$prd" > "$tmp/ms"

# FR id -> acceptance test id (M<N>_AT_###), from every specs/M*/acceptance.md "## Traceability" table.
for f in specs/M*/acceptance.md; do
  mid=$(basename "$(dirname "$f")"); mid=${mid%%-*}
  awk -F'|' -v mid="$mid" '/^## Traceability/{p=1;next} /^## /{p=0}
    p && $2 ~ /AT-[0-9]+/ {
      at = $2; gsub(/[ ]|AT-/, "", at); n = split($3, w, /[^A-Z0-9-]+/)
      for (i = 1; i <= n; i++) if (w[i] ~ /^FR-[0-9]+$/) print w[i] "\t" mid "_AT_" at
    }' "$f"
done | sort -u > "$tmp/at"

join_col() { awk -F'\t' -v k="$1" '$1==k{print $2}' "$2" | sort -u | paste -sd, - | sed 's/,/, /g'; }

echo "| FR | Requirement (shortened) | Milestone | Acceptance tests | Test files |"
echo "|---|---|---|---|---|"
grep -E '^- \*\*FR-[0-9]+\*\*' "$prd" | while IFS= read -r line; do
  fr=$(sed -E 's/^- \*\*(FR-[0-9]+)\*\*.*/\1/' <<<"$line")
  # Drop the id, the [Kind] and (US-n) tags and any trailing (CQ-n, ...) note; keep the first 12 words.
  text=$(sed -E 's/^- \*\*FR-[0-9]+\*\* \[[A-Za-z]+\] \(US-[0-9]+\) //; s/ \(CQ-[0-9]+,.*$//' <<<"$line")
  short=$(awk '{n = NF > 12 ? 12 : NF; s = $1; for (i = 2; i <= n; i++) s = s " " $i; if (NF > 12) s = s "…"; print s}' <<<"$text" | tr '|' '/')
  ms=$(join_col "$fr" "$tmp/ms"); ms=${ms:-⚠ none}
  ats=$(join_col "$fr" "$tmp/at")
  if [[ -z $ats ]]; then
    ats="⚠ none"; files="⚠ none"
  else
    files=$(for t in ${ats//,/ }; do grep -rlF "$t " tests/acceptance || true; done | sort -u | sed 's/.*/`&`/' | paste -sd, - | sed 's/,/, /g')
    files=${files:-⚠ none}
  fi
  echo "| $fr | $short | $ms | $ats | $files |"
done
