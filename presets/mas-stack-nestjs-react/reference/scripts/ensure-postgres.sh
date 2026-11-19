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
root="$(cd "$(dirname "$0")/.." && pwd)"
resolved="$(node --experimental-strip-types --input-type=module -e '
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(process.argv[1]));
process.stdout.write(mod.seedDatabaseUrl(process.env));
' "$root/apps/api/prisma/database-url.ts")" || {
  echo "ERROR: seed database URL was refused. When SEED_DATABASE_URL is set it must differ from DATABASE_URL. When it is unset, DATABASE_URL must use 127.0.0.1, localhost, or ::1." >&2
  exit 1
}
if ! pg_isready -d "$resolved" >/dev/null 2>&1; then
  echo "ERROR: Postgres is not accepting connections for the seed database." >&2
  echo "If this machine has no cluster, run initdb and start the server so postgresql.conf exists." >&2
  exit 1
fi
echo "postgres ok"
