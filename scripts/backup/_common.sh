#!/usr/bin/env bash
# Shared helpers for Skyline backup scripts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

load_config() {
  local conf="$SCRIPT_DIR/backup.conf"
  if [[ ! -f "$conf" ]]; then
    echo "Missing $conf — copy backup.conf.example to backup.conf and edit." >&2
    exit 1
  fi
  # shellcheck source=/dev/null
  source "$conf"

  : "${BACKUP_ROOT:?BACKUP_ROOT required in backup.conf}"
  : "${WEB_ROOT:?WEB_ROOT required in backup.conf}"
  : "${ENV_FILE:?ENV_FILE required in backup.conf}"
  RETENTION_DAYS="${RETENTION_DAYS:-14}"
  DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-80}"
  OFFSITE_ENABLED="${OFFSITE_ENABLED:-0}"
  RCLONE_REMOTE="${RCLONE_REMOTE:-}"
  RCLONE_DEST="${RCLONE_DEST:-skyline}"
  S3_BUCKET="${S3_BUCKET:-}"
  S3_PREFIX="${S3_PREFIX:-skyline}"
}

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  if [[ -n "${BACKUP_ROOT:-}" ]]; then
    mkdir -p "$BACKUP_ROOT"
    echo "$msg" >> "$BACKUP_ROOT/backup.log"
  fi
}

log_error() {
  log "ERROR: $*"
}

ensure_backup_dirs() {
  mkdir -p "$BACKUP_ROOT/db" "$BACKUP_ROOT/files"
  chmod 700 "$BACKUP_ROOT" 2>/dev/null || true
}

check_disk_space() {
  local mount
  mount="$(df "$BACKUP_ROOT" 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')"
  if [[ -n "$mount" && "$mount" -ge "$DISK_WARN_PERCENT" ]]; then
    log "WARN: backup partition ${mount}% full (threshold ${DISK_WARN_PERCENT}%)"
  fi
}

# Parse KEY=VALUE from api/.env (handles optional quotes).
read_env_var() {
  local file="$1"
  local key="$2"
  local line value
  if [[ ! -f "$file" ]]; then
    echo "Env file not found: $file" >&2
    return 1
  fi
  line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -1 || true)"
  if [[ -z "$line" ]]; then
    echo "Missing $key in $file" >&2
    return 1
  fi
  value="${line#*=}"
  value="$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  if [[ ${#value} -ge 2 ]]; then
    local first="${value:0:1}" last="${value: -1}"
    if [[ ("$first" == '"' && "$last" == '"') || ("$first" == "'" && "$last" == "'") ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi
  printf '%s' "$value"
}

load_db_credentials() {
  DB_HOST="$(read_env_var "$ENV_FILE" DB_HOST)"
  DB_PORT="$(read_env_var "$ENV_FILE" DB_PORT)"
  DB_NAME="$(read_env_var "$ENV_FILE" DB_NAME)"
  DB_USER="$(read_env_var "$ENV_FILE" DB_USER)"
  DB_PASS="$(read_env_var "$ENV_FILE" DB_PASS)"
  DB_PORT="${DB_PORT:-3306}"
}

find_mysqldump() {
  if command -v mysqldump >/dev/null 2>&1; then
    command -v mysqldump
    return 0
  fi
  for candidate in /usr/bin/mysqldump /usr/local/bin/mysqldump; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

find_mysql() {
  if command -v mysql >/dev/null 2>&1; then
    command -v mysql
    return 0
  fi
  for candidate in /usr/bin/mysql /usr/local/bin/mysql; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

apply_retention() {
  local dir="$1"
  local pattern="$2"
  log "Retention: removing $pattern in $dir older than ${RETENTION_DAYS} days"
  find "$dir" -maxdepth 1 -type f -name "$pattern" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
}

sync_offsite() {
  if [[ "$OFFSITE_ENABLED" != "1" ]]; then
    return 0
  fi

  if [[ -n "$RCLONE_REMOTE" ]] && command -v rclone >/dev/null 2>&1; then
    log "Offsite: rclone sync to ${RCLONE_REMOTE}:${RCLONE_DEST}"
    rclone sync "$BACKUP_ROOT" "${RCLONE_REMOTE}:${RCLONE_DEST}" --exclude 'backup.log' --exclude 'cron.log'
    return 0
  fi

  if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null 2>&1; then
    log "Offsite: aws s3 sync to s3://${S3_BUCKET}/${S3_PREFIX}/"
    aws s3 sync "$BACKUP_ROOT" "s3://${S3_BUCKET}/${S3_PREFIX}/" \
      --exclude 'backup.log' --exclude 'cron.log'
    return 0
  fi

  log "WARN: OFFSITE_ENABLED=1 but no rclone remote or S3_BUCKET configured"
}
