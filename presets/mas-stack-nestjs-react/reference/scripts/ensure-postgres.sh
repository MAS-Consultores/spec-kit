#!/usr/bin/env bash
set -euo pipefail
if ! command -v pg_isready >/dev/null 2>&1; then
  echo "ERROR: PostgreSQL client is not installed. Install postgresql and create a cluster before migrate." >&2
  echo "Debian/Ubuntu: sudo apt-get install postgresql && sudo pg_ctlcluster 16 main start" >&2
  exit 1
fi
if [[ -n "${PGDATA:-}" && ! -f "${PGDATA}/postgresql.conf" ]]; then
  echo "ERROR: ${PGDATA} has no postgresql.conf. A freshly installed Postgres has no cluster yet." >&2
  echo "Create one with: initdb -D \"${PGDATA}\" && pg_ctl -D \"${PGDATA}\" start" >&2
  exit 1
fi
if [[ -z "${SEED_DATABASE_URL:-}" ]]; then
  echo "ERROR: SEED_DATABASE_URL is empty. Point it at the e2e database, not DATABASE_URL." >&2
  exit 1
fi
if [[ "${SEED_DATABASE_URL}" == "${DATABASE_URL:-}" ]]; then
  echo "ERROR: SEED_DATABASE_URL and DATABASE_URL are the same. Keep the e2e database separate." >&2
  exit 1
fi
if ! pg_isready -d "$SEED_DATABASE_URL" >/dev/null 2>&1; then
  echo "ERROR: Postgres is not accepting connections for SEED_DATABASE_URL." >&2
  echo "If this machine has no cluster, run initdb and start the server so postgresql.conf exists." >&2
  exit 1
fi
echo "postgres ok"
