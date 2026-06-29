#!/usr/bin/env bash
# Run daily DB + file backups, rotate old files, optional offsite sync.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_config
ensure_backup_dirs

log "========== backup-all started =========="
FAILED=0

if ! "$SCRIPT_DIR/backup-db.sh"; then
  log_error "backup-db.sh failed"
  FAILED=1
fi

if ! "$SCRIPT_DIR/backup-files.sh"; then
  log_error "backup-files.sh failed"
  FAILED=1
fi

apply_retention "$BACKUP_ROOT/db" 'skyline_*.sql.gz'
apply_retention "$BACKUP_ROOT/files" 'skyline_files_*.tar.gz'

if [[ "$FAILED" -eq 0 ]]; then
  sync_offsite || log "WARN: offsite sync failed (local backups kept)"
  log "========== backup-all finished OK =========="
  exit 0
fi

log "========== backup-all finished WITH ERRORS =========="
exit 1
