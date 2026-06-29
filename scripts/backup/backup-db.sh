#!/usr/bin/env bash
# Daily MariaDB dump for Skyline-App.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_config
ensure_backup_dirs
check_disk_space
load_db_credentials

MYSQLDUMP="$(find_mysqldump)" || { log_error "mysqldump not found"; exit 1; }

STAMP="$(date '+%Y-%m-%d')"
OUTFILE="$BACKUP_ROOT/db/skyline_${STAMP}.sql.gz"

log "DB backup started -> $OUTFILE"

export MYSQL_PWD="$DB_PASS"
"$MYSQLDUMP" \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  "$DB_NAME" | gzip -c > "$OUTFILE"
unset MYSQL_PWD

if ! gzip -t "$OUTFILE"; then
  log_error "gzip integrity check failed for $OUTFILE"
  rm -f "$OUTFILE"
  exit 1
fi

chmod 600 "$OUTFILE"
SIZE="$(du -h "$OUTFILE" | cut -f1)"
log "DB backup finished ($SIZE)"
