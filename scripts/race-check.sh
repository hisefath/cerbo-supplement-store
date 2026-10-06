#!/usr/bin/env bash
# Real concurrency check against a running app (use Postgres + multiple PHP workers):
#   PHP_CLI_SERVER_WORKERS=8 DB_CONNECTION=pgsql ... php artisan serve --port=8102
#   scripts/race-check.sh http://127.0.0.1:8102
# 1) Double-pay: 8 simultaneous payments (8 different idempotency keys) for ONE order → exactly 1 succeeds.
# 2) Oversell: 6 orders for a product with 4 in stock, all paid at once → exactly 4 succeed, stock ends at 0.
set -euo pipefail
B=${1:-http://127.0.0.1:8102}
DIR=$(mktemp -d)
token() { grep -o 'name="csrf-token" content="[^"]*' | cut -d'"' -f4; }

send_order() { # $1 = lines query string → prints the patient pay URL
  local jar=$DIR/provider t loc
  t=$(curl -s -c $jar -b $jar "$B/orders/new" | token)
  loc=$(curl -s -c $jar -b $jar -o /dev/null -w '%{redirect_url}' -X POST "$B/orders" --data-urlencode "_token=$t" -d "patient_id=1" $1)
  curl -s -c $jar -b $jar "$loc" | grep -o "$B/pay/[A-Za-z0-9]*" | head -1
}

prepare_attempt() { # $1 = pay URL, $2 = attempt id → writes a ready-to-fire curl config (own session = own tab)
  local jar=$DIR/tab$2 page
  page=$(curl -s -c $jar -b $jar "$1")
  printf -- '-s\n-o /dev/null\n-w "%%{http_code}\\n"\n-b %s\n-X POST\nurl = "%s"\ndata = "_token=%s&payment_method=pm_fake_visa&idempotency_key=%s"\n' \
    "$jar" "$1" "$(echo "$page" | token)" "$(echo "$page" | grep -o 'name="idempotency_key" value="[^"]*' | cut -d'"' -f4)" > $DIR/attempt$2.cfg
}

echo "1) Double-pay race: 8 tabs pay the same order at once"
PAY=$(send_order "-d lines[1][quantity]=1 -d lines[1][price]=50.00")
for i in $(seq 1 8); do prepare_attempt "$PAY" "d$i"; done
ls $DIR/attemptd*.cfg | xargs -P 8 -I{} curl -K {} >/dev/null
echo "   order page says: $(curl -s "$PAY" | grep -oE 'Paid ✓|Payment in progress|Pay \$[0-9.]+' | head -1)"

echo "2) Oversell race: 6 orders x 1 unit of a 4-unit product, paid at once"
PID=$(curl -s "$B/orders/new" | grep -B2 -A0 'Probiotic' | grep -o 'data-id="[0-9]*"' | grep -o '[0-9]*' | head -1)
for i in $(seq 1 6); do prepare_attempt "$(send_order "-d lines[$PID][quantity]=1 -d lines[$PID][price]=40.00")" "s$i"; done
ls $DIR/attempts*.cfg | xargs -P 6 -I{} curl -K {} >/dev/null
PAID=0; for i in $(seq 1 6); do grep -q 'Paid ✓' <(curl -s -b $DIR/tabs$i "$(grep url $DIR/attempts$i.cfg | cut -d'"' -f2)") && PAID=$((PAID+1)); done
echo "   paid: $PAID of 6 (expected 4)"
rm -rf "$DIR"
