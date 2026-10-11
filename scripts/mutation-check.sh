#!/usr/bin/env bash
# mutation-check.sh — plants one known bug at a time in the money code and checks a test catches it (finding F43).
# Each mutant: apply a perl substitution in place, run the fastest test that covers it, record KILLED or SURVIVED,
# then `git checkout -- <file>` (always, via trap). Exit 1 when any mutant SURVIVED or a substitution matched nothing.
# Acceptance mutants need the test database (make db-test-up, 127.0.0.1:54329); each one boots Nuxt.
# Run: make mutation-check. Not part of make check: too slow. See docs/ops/MUTATION.md.
set -u
cd "$(git rev-parse --show-toplevel)"

UNIT='npx vitest run --dir tests/unit'
acc() { echo "npx vitest run $1 -t $2"; }

FILES=(server/services/money.ts server/services/payments.ts server/services/pricing.ts server/services/orders.ts server/services/idempotency.ts)
if ! git diff --quiet -- "${FILES[@]}"; then
  echo "mutation-check: commit or set aside your changes to ${FILES[*]} first (the script restores them with git checkout)" >&2
  exit 2
fi

current=''
trap '[ -n "$current" ] && git checkout -q -- "$current"' EXIT INT TERM

echo "baseline: unit tests must pass before planting bugs"
if ! $UNIT >/dev/null 2>&1; then echo "mutation-check: unit tests fail without any mutant; fix them first" >&2; exit 2; fi

rows=()
bad=0
# mutant <name> <file> <perl -0777 substitution> <test command>
mutant() {
  local name=$1 file=$2 expr=$3 cmd=$4 verdict
  current=$file
  perl -0777 -pi -e "$expr" "$file"
  if git diff --quiet -- "$file"; then
    verdict='NOT APPLIED'
    bad=1
  elif $cmd >/dev/null 2>&1; then
    verdict='SURVIVED'
    bad=1
  else
    verdict='KILLED'
  fi
  git checkout -q -- "$file"
  current=''
  rows+=("| $name | $file | \`$cmd\` | $verdict |")
  echo "$verdict  $name"
}

M=server/services/money.ts
P=server/services/payments.ts
mutant fee-floor-not-half-up        $M 's/amountPaidCents \* 75 \+ 5000\)/amountPaidCents * 75)/' "$UNIT"
mutant fee-half-down                $M 's/\* 75 \+ 5000\)/* 75 + 4999)/' "$UNIT"
mutant fee-plus-one-cent            $M 's{\(amountPaidCents \* 75 \+ 5000\) / 10000\)}{(amountPaidCents * 75 + 5000) / 10000) + 1}' "$UNIT"
mutant payout-adds-fee              $M 's/amountPaidCents - itemCostCents - feeCents/amountPaidCents - itemCostCents + feeCents/' "$UNIT"
mutant fee-share-ties-to-later-line $M 's/x\.i - y\.i/y.i - x.i/' "$UNIT"
mutant floor-one-cent-low           $M 's/platformFeeCents\(p\)\) < 0\)/platformFeeCents(p)) < -1)/' "$UNIT"
mutant fee-on-cost-not-total        $P 's/const fee = platformFeeCents\(amountPaidCents\)/const fee = platformFeeCents(itemCostCents)/' "$UNIT"
mutant fee-rounded-per-line         $P 's/const fee = platformFeeCents\(amountPaidCents\)/const fee = amounts.reduce((s, a) => s + platformFeeCents(a), 0)/' "$UNIT"
mutant price-change-below-floor     server/services/pricing.ts 's/if \(price < lowest\)/if (price < lowest - 1)/' "$UNIT"
mutant send-below-floor-allowed     server/services/orders.ts 's/if \(belowFloor\.length > 0\)/if (belowFloor.length > 1)/' "$(acc tests/acceptance/M4/send-order.test.ts 'M4_AT_0(03|41)')"
mutant order-row-payout-fee-swapped $P 's/provider_payout_cents: split\.providerPayoutCents,(\s*)platform_fee_cents: split\.platformFeeCents/provider_payout_cents: split.platformFeeCents,${1}platform_fee_cents: split.providerPayoutCents/' "$(acc tests/acceptance/M4/pay-order.test.ts M4_AT_009)"
mutant ledger-payout-fee-swapped    $P "s/\\['provider_payout', split\\.providerPayoutCents\\],(\\s*)\\['platform_fee', split\\.platformFeeCents\\]/['provider_payout', split.platformFeeCents],\${1}['platform_fee', split.providerPayoutCents]/" "$(acc tests/acceptance/M4/pay-order.test.ts M4_AT_009)"
mutant pay-without-order-row-lock   $P "s/(\\.where\\('id', '=', orderId\\.toString\\(\\)\\))\\s*\\.forUpdate\\(\\)/\${1}/" "$(acc tests/acceptance/M4/pay-order.test.ts M4_AT_038)"
mutant negative-payout-charged      $P 's/if \(split\.providerPayoutCents < 0\) throw/if (false) throw/' "$(acc tests/acceptance/M5/m4-regressions.test.ts M5_AT_033)"
mutant idempotent-replay-skipped    server/services/idempotency.ts "s/if \\('replay' in started\\) return/if (false) return/" "$(acc tests/acceptance/M4/pay-order.test.ts M4_AT_006)"

echo
echo "| Mutant | File | Test command | Result |"
echo "|---|---|---|---|"
printf '%s\n' "${rows[@]}"
if [ "$bad" -ne 0 ]; then echo "mutation-check: FAIL (a mutant survived or did not apply)"; exit 1; fi
echo "mutation-check: OK (${#rows[@]} mutants, all killed)"
