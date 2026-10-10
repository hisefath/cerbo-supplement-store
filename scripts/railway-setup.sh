#!/usr/bin/env bash
# scripts/railway-setup.sh — one-time (and re-runnable) setup of the v2 demo database on Railway.
# Run it yourself from the project root: bash scripts/railway-setup.sh [--skip-seed]
#
# What it does (docs/runbooks/deploy.md §2, FS-4 to FS-8):
#   1. creates .env.railway (git-ignored, readable only by you) with three random passwords, or reuses it
#   2. sets the passwords on the database roles supplements_owner and supplements_app in postgres-v2
#   3. sets DATABASE_URL on web-v2 (the app's limited login, through Railway's private network)
#   4. opens a railway connect tunnel, runs the migrations as supplements_owner, closes the tunnel
#   5. loads the fictional demo world (skip with --skip-seed); re-running resets the demo
#
# It never prints a password. On an error it prints a generic message, never the raw output, because a database
# error can echo the SQL that carried a password. Your demo sign-in password is DEMO_PASSWORD in .env.railway.
set -euo pipefail

ENV_FILE=.env.railway
DB_SERVICE=postgres-v2
WEB_SERVICE=web-v2
RAILWAY_ENV=production
SEED=yes
[ "${1:-}" = "--skip-seed" ] && SEED=no

cd "$(git rev-parse --show-toplevel)"
die() { printf 'STOP: %s\n' "$1" >&2; exit 1; }

# ---- 0. preconditions ----
git check-ignore -q "$ENV_FILE" || die "$ENV_FILE is not git-ignored; refusing to write passwords"
git diff --quiet HEAD -- db/migrations db/seed || die "db/migrations or db/seed has uncommitted changes; commit or discard them first"
command -v railway >/dev/null || die "railway CLI not found"
command -v openssl >/dev/null || die "openssl not found"
command -v nc >/dev/null || die "nc not found"
railway whoami >/dev/null 2>&1 || die "not logged in to Railway: run railway login yourself"
railway status 2>/dev/null | grep -q "$DB_SERVICE" || die "$DB_SERVICE not found in the linked Railway project"

# ---- 1. passwords in .env.railway ----
if [ ! -f "$ENV_FILE" ]; then
  umask 077
  {
    echo "# Railway v2 demo secrets for cerbo-supplement-store. Git-ignored. Never commit, paste or share."
    echo "OWNER_PASSWORD=$(openssl rand -hex 24)"
    echo "APP_PASSWORD=$(openssl rand -hex 24)"
    echo "DEMO_PASSWORD=$(openssl rand -hex 12)"
  } > "$ENV_FILE"
  echo "1/5 created $ENV_FILE with three new passwords (mode 600)"
else
  echo "1/5 reusing existing $ENV_FILE"
fi
chmod 600 "$ENV_FILE"
# shellcheck disable=SC1090
. "./$ENV_FILE"
for v in OWNER_PASSWORD APP_PASSWORD DEMO_PASSWORD; do
  [ -n "${!v:-}" ] || die "$v is missing in $ENV_FILE"
  printf '%s' "${!v}" | grep -Eq '^[0-9a-f]{16,}$' || die "$v in $ENV_FILE must be lowercase hex (no quotes or special characters)"
done

# ---- 2. role passwords ----
out="$(printf "ALTER ROLE supplements_owner PASSWORD '%s';\nALTER ROLE supplements_app PASSWORD '%s';\n" \
  "$OWNER_PASSWORD" "$APP_PASSWORD" | railway connect "$DB_SERVICE" 2>&1)" || true
[ "$(printf '%s\n' "$out" | grep -c '^ALTER ROLE')" = 2 ] \
  || die "setting the role passwords failed (output hidden because it can contain the SQL); check the roles exist (FS-4)"
unset out
echo "2/5 role passwords set on supplements_owner and supplements_app"

# ---- 3. the app's DATABASE_URL on web-v2 (Railway fills in the private host) ----
# shellcheck disable=SC2016
printf 'postgres://supplements_app:%s@${{%s.RAILWAY_PRIVATE_DOMAIN}}:5432/railway' "$APP_PASSWORD" "$DB_SERVICE" \
  | railway variable set DATABASE_URL --stdin --service "$WEB_SERVICE" --environment "$RAILWAY_ENV" --skip-deploys >/dev/null 2>&1 \
  || die "setting DATABASE_URL on $WEB_SERVICE failed"
echo "3/5 DATABASE_URL set on $WEB_SERVICE (no deploy triggered)"

# ---- 4. migrations through a railway connect tunnel ----
WORK="$(mktemp -d)"
TUNNEL_LOG="$WORK/tunnel.log"
cleanup() {
  [ -n "${HOLD_PID:-}" ] && kill "$HOLD_PID" 2>/dev/null || true
  [ -n "${TUNNEL_PID:-}" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT
mkfifo "$WORK/hold"
sleep 900 > "$WORK/hold" & HOLD_PID=$!; disown "$HOLD_PID"
railway connect "$DB_SERVICE" < "$WORK/hold" > "$TUNNEL_LOG" 2>&1 & TUNNEL_PID=$!; disown "$TUNNEL_PID"
PORT=""
for _ in $(seq 1 30); do
  PORT="$(sed -nE 's/.*Opening SSH tunnel: 127\.0\.0\.1:([0-9]+).*/\1/p' "$TUNNEL_LOG" | head -n 1)"
  [ -n "$PORT" ] && nc -z 127.0.0.1 "$PORT" 2>/dev/null && break
  PORT=""; sleep 1
done
[ -n "$PORT" ] || die "the railway connect tunnel did not open within 30 seconds"
OWNER_URL="postgres://supplements_owner:${OWNER_PASSWORD}@127.0.0.1:${PORT}/railway"

mask() { sed -e "s/${OWNER_PASSWORD}/***/g" -e "s/${APP_PASSWORD}/***/g" -e "s/${DEMO_PASSWORD}/***/g"; }

if DATABASE_URL="$OWNER_URL" npx node-pg-migrate up -m db/migrations > "$WORK/migrate.log" 2>&1; then
  applied="$(grep -c '### MIGRATION .* (UP) ###' "$WORK/migrate.log" || true)"
  echo "4/5 migrations: $applied applied ($(grep -oE 'Migrations complete!|No migrations to run!' "$WORK/migrate.log" | tail -n 1))"
else
  echo "STOP: migrations failed; last lines (passwords masked):" >&2
  tail -n 5 "$WORK/migrate.log" | mask >&2
  exit 1
fi

# ---- 5. demo data ----
if [ "$SEED" = yes ]; then
  if DEMO_RESET=yes DEMO_PASSWORD="$DEMO_PASSWORD" DATABASE_URL="$OWNER_URL" node db/seed/demo.ts > "$WORK/seed.log" 2>&1; then
    echo "5/5 $(tail -n 1 "$WORK/seed.log" | mask)"
  else
    echo "STOP: demo data load failed; last lines (passwords masked):" >&2
    tail -n 5 "$WORK/seed.log" | mask >&2
    exit 1
  fi
else
  echo "5/5 demo data skipped (--skip-seed)"
fi

echo "done. Demo sign-in: any demo person's email (e.g. maya.chen@example.test) with DEMO_PASSWORD from $ENV_FILE."
