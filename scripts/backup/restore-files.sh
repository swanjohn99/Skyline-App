#!/usr/bin/env bash
# Restore server files from a tar.gz archive.
# Usage: ./restore-files.sh [path/to/skyline_files_YYYY-MM-DD.tar.gz]
# Extracts to a staging dir first; copies api/uploads and api/.env with confirmation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_config

ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" ]]; then
  ARCHIVE="$(ls -t "$BACKUP_ROOT/files"/skyline_files_*.tar.gz 2>/dev/null | head -1 || true)"
fi

if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  log_error "Archive not found. Pass path or ensure $BACKUP_ROOT/files/skyline_files_*.tar.gz exists"
  exit 1
fi

if ! tar -tzf "$ARCHIVE" >/dev/null 2>&1; then
  log_error "Archive failed tar check: $ARCHIVE"
  exit 1
fi

STAGING="$BACKUP_ROOT/restore-staging-$(date +%s)"
mkdir -p "$STAGING"

log "Extracting $ARCHIVE to $STAGING"
tar -xzf "$ARCHIVE" -C "$STAGING"

read -r -p "Restore api/ tree to $WEB_ROOT/api ? Type YES: " confirm_api
if [[ "$confirm_api" == "YES" ]]; then
  rsync -a --delete "$STAGING/api/" "$WEB_ROOT/api/"
  log "api/ restored"
fi

if [[ -f "$STAGING/api/.env" ]]; then
  read -r -p "Overwrite $WEB_ROOT/api/.env ? Type YES: " confirm_env
  if [[ "$confirm_env" == "YES" ]]; then
    cp "$STAGING/api/.env" "$WEB_ROOT/api/.env"
    chmod 600 "$WEB_ROOT/api/.env"
    log "api/.env restored"
  fi
fi

if [[ -d "$STAGING/app" ]]; then
  read -r -p "Restore app/ to $WEB_ROOT/app ? Type YES: " confirm_app
  if [[ "$confirm_app" == "YES" ]]; then
    mkdir -p "$WEB_ROOT/app"
    rsync -a "$STAGING/app/" "$WEB_ROOT/app/"
    log "app/ restored"
  fi
elif [[ -d "$STAGING/dist" ]]; then
  read -r -p "Restore dist/ to $WEB_ROOT/dist ? Type YES: " confirm_dist
  if [[ "$confirm_dist" == "YES" ]]; then
    mkdir -p "$WEB_ROOT/dist"
    rsync -a "$STAGING/dist/" "$WEB_ROOT/dist/"
    log "dist/ restored"
  fi
fi

rm -rf "$STAGING"
log "Files restore finished"
