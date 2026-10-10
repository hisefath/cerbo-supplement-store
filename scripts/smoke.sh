#!/usr/bin/env bash
# scripts/smoke.sh — written by ship-milestone (software-factory-kit 0.1) for cerbo-supplement-store.
# Proves that the deployment at <base-url> runs <expected-sha> and that its core journey answers.
# Usage: bash scripts/smoke.sh <https-base-url> <expected-sha>
# Exit:  0 every check passed · 1 at least one check failed · 2 bad arguments
# Rules: TLS verification always on; GET only; no credentials; never creates orders, payments or accounts.
#        curl -q (first argument) ignores ~/.curlrc, so no config file can switch TLS verification off.
# Check ids map to acceptance ids in docs/runbooks/deploy.md §4.
set -euo pipefail

usage="usage: bash scripts/smoke.sh <https-base-url> <expected-sha>"
if [ "$#" -ne 2 ]; then
  echo "$usage" >&2; exit 2
fi
BASE_URL="${1%/}"
EXPECTED_SHA="$(printf '%s' "$2" | tr 'A-F' 'a-f')"

case "$BASE_URL" in
  https://*) ;;
  *) echo "FAIL arguments: base url must start with https:// (verified TLS is part of the check)" >&2; exit 2 ;;
esac
if ! printf '%s' "$EXPECTED_SHA" | grep -Eq '^[0-9a-f]{7,40}$'; then
  echo "FAIL arguments: expected sha must be 7-40 hex characters" >&2; exit 2
fi

HEALTH_PATH="/healthz"
CURL=(curl -q --silent --show-error --proto '=https' --tlsv1.2 --max-time 15
      --retry 2 --retry-delay 3 --user-agent 'software-factory-kit-smoke/0.1')

passed=0
failed=0
pass() { passed=$((passed + 1)); printf 'PASS %s\n' "$1"; }
fail() { failed=$((failed + 1)); printf 'FAIL %s\n' "$1"; }

# check <id> <path> <expected http status> [<text the body must contain>]
check() {
  local id="$1" path="$2" want="$3" needle="${4:-}" body code
  body="$(mktemp "${TMPDIR:-/tmp}/smoke.XXXXXX")"
  if ! code="$("${CURL[@]}" --output "$body" --write-out '%{http_code}' "$BASE_URL$path")"; then
    fail "$id GET $path: no HTTP answer (TLS, DNS, connection or timeout error above)"
  elif [ "$code" != "$want" ]; then
    fail "$id GET $path: HTTP $code, want $want"
  elif [ -n "$needle" ] && ! grep -qF -- "$needle" "$body"; then
    fail "$id GET $path: HTTP $code but the body lacks \"$needle\""
  else
    pass "$id GET $path -> $code"
  fi
  rm -f "$body"
}

# check_version <id>: GET /version must report the expected commit and a built_at time
check_version() {
  local id="$1" body commit built_at
  if ! body="$("${CURL[@]}" --fail -H 'Accept: application/json' "$BASE_URL/version" | tr '\n' ' ')"; then
    fail "$id GET /version: no 2xx answer (error above)"
    return 0
  fi
  commit="$(printf '%s' "$body" | sed -nE 's/.*"commit"[[:space:]]*:[[:space:]]*"([0-9a-fA-F]{7,40})".*/\1/p' | tr 'A-F' 'a-f')"
  built_at="$(printf '%s' "$body" | sed -nE 's/.*"built_at"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p')"
  if [ -z "$commit" ]; then
    fail "$id GET /version: no \"commit\" field in: ${body:0:200}"
  elif [ -z "$built_at" ]; then
    fail "$id GET /version: no \"built_at\" field"
  elif [[ "$commit" == "$EXPECTED_SHA"* || "$EXPECTED_SHA" == "$commit"* ]]; then
    pass "$id GET /version -> commit $commit, built_at $built_at"
  else
    fail "$id GET /version: live commit $commit, expected $EXPECTED_SHA"
  fi
}

echo "smoke: $BASE_URL expecting $EXPECTED_SHA at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# check_page_security <id-csp> <id-headers> <path>: the CSP must list the SHA-256 of every inline script the page
# renders (else browsers block the app's JavaScript: review pass 7 R1), and HSTS and nosniff must be sent (SEC-4).
check_page_security() {
  local id_csp="$1" id_hdr="$2" path="$3" body headers
  body="$(mktemp "${TMPDIR:-/tmp}/smoke.XXXXXX")"; headers="$(mktemp "${TMPDIR:-/tmp}/smoke.XXXXXX")"
  if ! "${CURL[@]}" --fail --dump-header "$headers" --output "$body" "$BASE_URL$path"; then
    fail "$id_csp GET $path: no 2xx answer (error above)"; fail "$id_hdr GET $path: no 2xx answer"
    rm -f "$body" "$headers"; return 0
  fi
  local verdict
  verdict="$(python3 - "$body" "$headers" <<'PY'
import base64, hashlib, re, sys
html = open(sys.argv[1], encoding="utf-8", errors="replace").read()
hdr = open(sys.argv[2], encoding="utf-8", errors="replace").read()
csp = " ".join(l.split(":", 1)[1] for l in hdr.splitlines() if l.lower().startswith("content-security-policy:"))
src = next((d for d in csp.split(";") if d.strip().startswith("script-src")), "")
missing = 0; total = 0
for m in re.finditer(r"<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>", html, re.S):
    if "application/json" in m.group(1): continue
    total += 1
    h = "'sha256-" + base64.b64encode(hashlib.sha256(m.group(2).encode()).digest()).decode() + "'"
    if h not in src: missing += 1
print("nocsp" if not src else f"{total} {missing}")
PY
)" || verdict="error"
  case "$verdict" in
    nocsp) fail "$id_csp GET $path: no Content-Security-Policy script-src header" ;;
    error) fail "$id_csp GET $path: could not check the CSP (python3 missing?)" ;;
    *" 0") pass "$id_csp GET $path -> CSP lists all ${verdict% *} inline script hash(es)" ;;
    *) fail "$id_csp GET $path: ${verdict#* } of ${verdict% *} inline script(s) not in the CSP; browsers will block the app's JavaScript" ;;
  esac
  if grep -qi '^strict-transport-security:' "$headers" && grep -qi '^x-content-type-options: *nosniff' "$headers"; then
    pass "$id_hdr GET $path -> HSTS and nosniff present"
  else
    fail "$id_hdr GET $path: missing Strict-Transport-Security or X-Content-Type-Options: nosniff"
  fi
  rm -f "$body" "$headers"
}

# ---- release identity and health: always ----
check_version SM-1
check SM-2 "$HEALTH_PATH" 200 "ok"

# ---- core journey, read-only: one line per Demo smoke step an anonymous GET can prove (deploy.md §4) ----
check SM-3 "/sign-in" 200 "Sign in"   # demo 1 AT-032, AT-035
check SM-4 "/orders/1001" 303   # demo 8 AE-038, AT-033 logged out -> redirect to sign-in
check SM-5 "/api/session" 401   # demo 8 AT-033 the API refuses a stranger
check_page_security SM-6 SM-7 "/sign-in"   # demo 5 SEC-4, review pass 7 R1

if [ "$failed" -gt 0 ]; then
  echo "SMOKE RED: $failed failed, $passed passed against $BASE_URL (expected $EXPECTED_SHA)"
  exit 1
fi
echo "SMOKE GREEN: $passed passed, 0 failed against $BASE_URL at $EXPECTED_SHA (TLS verified)"
