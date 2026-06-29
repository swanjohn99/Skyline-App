#!/usr/bin/env bash
# Archive Skyline server files (api, uploads, .env, SPA).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_config
ensure_backup_dirs
check_disk_space

API_DIR="$WEB_ROOT/api"
APP_DIR=""
if [[ -d "$WEB_ROOT/app" ]]; then
  APP_DIR="app"
elif [[ -d "$WEB_ROOT/dist" ]]; then
  APP_DIR="dist"
fi

if [[ ! -d "$API_DIR" ]]; then
  log_error "api directory not found: $API_DIR"
  exit 1
fi

STAMP="$(date '+%Y-%m-%d')"
OUTFILE="$BACKUP_ROOT/files/skyline_files_${STAMP}.tar.gz"

TAR_ARGS=(api)
if [[ -n "$APP_DIR" ]]; then
  TAR_ARGS+=("$APP_DIR")
fi

log "Files backup started -> $OUTFILE (paths: ${TAR_ARGS[*]})"

cd "$WEB_ROOT"
tar -czf "$OUTFILE" \
  --exclude='*.zip' \
  --exclude='node_modules' \
  "${TAR_ARGS[@]}"

if ! tar -tzf "$OUTFILE" >/dev/null 2>&1; then
  log_error "tar integrity check failed for $OUTFILE"
  rm -f "$OUTFILE"
  exit 1
fi

chmod 600 "$OUTFILE"
SIZE="$(du -h "$OUTFILE" | cut -f1)"
log "Files backup finished ($SIZE)"
