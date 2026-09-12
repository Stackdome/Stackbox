#!/usr/bin/env bash
set -euo pipefail

# Hard-wired to compose.yaml's postgres service, shorter than parsing DATABASE_URL.
PGHOST=localhost
PGPORT=5433
PGUSER=postgres
export PGPASSWORD=postgres

if ! psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -lqt | cut -d '|' -f 1 | grep -qw stackbox_test; then
  createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" stackbox_test
fi
