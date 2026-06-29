#!/usr/bin/env bash
# Restore MariaDB from a gzip dump.
# Usage: ./restore-db.sh [path/to/skyline_YYYY-MM-DD.sql.gz]
# WARNING: overwrites the target database. Use a test DB first.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_config
load_db_credentials

DUMP="${1:-}"
if [[ -z "$DUMP" ]]; then
  DUMP="$(ls -t "$BACKUP_ROOT/db"/skyline_*.sql.gz 2>/dev/null | head -1 || true)"
fi

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  log_error "Dump file not found. Pass path or ensure $BACKUP_ROOT/db/skyline_*.sql.gz exists"
  exit 1
fi

if ! gzip -t "$DUMP"; then
  log_error "Dump failed gzip check: $DUMP"
  exit 1
fi

MYSQL="$(find_mysql)" || { log_error "mysql client not found"; exit 1; }

log "Restoring DB $DB_NAME on $DB_HOST from $DUMP"
read -r -p "This will overwrite database '$DB_NAME'. Type YES to continue: " confirm
if [[ "$confirm" != "YES" ]]; then
  log "Aborted."
  exit 1
fi

export MYSQL_PWD="$DB_PASS"
gunzip -c "$DUMP" | "$MYSQL" \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  "$DB_NAME"
unset MYSQL_PWD

log "DB restore finished"
