# Makefile — `make check` is this project's single green/red command (software-factory-kit WORKFLOW.md §2 rule 4).
# Every agent runs it before claiming done, the supervisor re-runs it to verify, and .githooks/pre-push runs it
# before anything leaves the machine. It must exit non-zero when ANY part fails.
#
# ADAPT PER STACK: replace the three recipes below with this project's real commands (and copy them into the
# Commands table in AGENTS.md). Until then they fail on purpose, so an unconfigured repo can never look green.
# Keep the target names: skills and hooks call `make check`, not the tools directly.

.PHONY: check lint types test setup db-test-up test-acceptance

## check: lint + types + tests — the gate
check: lint types test
	@echo "make check: OK"

## lint: workflow scripts must parse (docs-only phase: no product code yet; stack tools are added at M3 design)
lint:
	@for f in scripts/*.sh .githooks/pre-push; do bash -n "$$f" || exit 1; done

## types: none until a stack exists
types:
	@true

## test: design docs' embedded diagrams must match their .mmd sources (once docs/architecture/*.md exist)
test:
	@set -- docs/architecture/*.md; if [ -e "$$1" ]; then bash scripts/embed-diagrams.sh --check "$$@"; fi

## setup: install the pinned dependencies (package-lock.json)
setup:
	npm ci

## db-test-up: start the throwaway PostgreSQL 16 test database (localhost:54329)
db-test-up:
	docker compose up -d db-test

## test-acceptance: QA-owned acceptance tests (red until their milestone is built; not part of check until merge)
test-acceptance:
	npx vitest run tests/acceptance

# --- Example: Laravel 13 / PHP 8.5 (Pint + Larastan/PHPStan + Pest or PHPUnit) -------------------------------
# Replace the three recipes above with these (recipe lines must start with a TAB):
#
# lint:
# 	vendor/bin/pint --test
#
# types:
# 	vendor/bin/phpstan analyse --no-progress --memory-limit=1G
#
# test:
# 	php artisan test --compact
#
# Optional extras once they exist: `composer validate --strict` in lint, `php artisan test --parallel` in test,
# `bash scripts/embed-diagrams.sh --check docs/architecture/*.md` as a docs target added to check.
