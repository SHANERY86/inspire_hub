#!/usr/bin/env bash
#
# Inspire Hub backup on the Pi: Postgres dump + media → .tar.gz, optional Google Drive via rclone.
# Intended for weekly cron on the device (no SSH from Mac required).
#
# One-time setup: docs/backup-google-drive.md (rclone + cron).
#
# Usage on Pi:
#   ./scripts/backup-on-pi.sh
#   RCLONE_DEST=gdrive:inspire-hub-backups ./scripts/backup-on-pi.sh
#
# Config file (optional): /etc/default/inspire-hub-backup
#
set -euo pipefail

if [[ -f /etc/default/inspire-hub-backup ]]; then
  # shellcheck disable=SC1091
  source /etc/default/inspire-hub-backup
fi

INSTALL_DIR="${INSTALL_DIR:-/opt/inspire_hub}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.ghcr.yml}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/inspire_hub}"
RETAIN_LOCAL="${RETAIN_LOCAL:-0}"
RETAIN_REMOTE="${RETAIN_REMOTE:-1}"
RCLONE_DEST="${RCLONE_DEST:-}"
VERBOSE="${VERBOSE:-0}"
BACKUP_GLOB="inspire_hub_backup_*.tar.gz"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

[[ "${VERBOSE}" == 1 ]] && set -x

cd "${INSTALL_DIR}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  log "ERROR: missing ${INSTALL_DIR}/${COMPOSE_FILE}"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose -f "${COMPOSE_FILE}")
elif docker-compose version >/dev/null 2>&1; then
  COMPOSE=(docker-compose -f "${COMPOSE_FILE}")
else
  log "ERROR: neither docker compose nor docker-compose found"
  exit 1
fi

if ! "${COMPOSE[@]}" ps --status running db -q | grep -q .; then
  log "ERROR: Postgres container (db) is not running"
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
STAGING="${BACKUP_DIR}/.staging_${STAMP}"
ARCHIVE="${BACKUP_DIR}/inspire_hub_backup_${STAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"
rm -rf "${STAGING}"
mkdir -p "${STAGING}"

{
  echo "created_at=$(date -Iseconds 2>/dev/null || date)"
  echo "hostname=$(hostname)"
  echo "install_dir=${INSTALL_DIR}"
  echo "compose_file=${COMPOSE_FILE}"
} > "${STAGING}/manifest.txt"

log "pg_dump ..."
"${COMPOSE[@]}" exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' \
  > "${STAGING}/postgres.sql"

if [[ ! -s "${STAGING}/postgres.sql" ]]; then
  log "ERROR: pg_dump failed or empty dump"
  rm -rf "${STAGING}"
  exit 1
fi

gzip -9 "${STAGING}/postgres.sql"
log "postgres dump: $(du -h "${STAGING}/postgres.sql.gz" | awk '{print $1}')"

log "media (screenshots) ..."
if "${COMPOSE[@]}" ps --status running backend -q | grep -q .; then
  "${COMPOSE[@]}" exec -T backend \
    sh -c 'cd /app/media 2>/dev/null && [ -n "$(ls -A . 2>/dev/null)" ] && tar -cf - . || true' \
    > "${STAGING}/media.tar" || true
  if [[ ! -s "${STAGING}/media.tar" ]]; then
    rm -f "${STAGING}/media.tar"
    echo "(no media files)" >> "${STAGING}/manifest.txt"
  else
    log "media archive: $(du -h "${STAGING}/media.tar" | awk '{print $1}')"
  fi
else
  echo "backend not running; skipped media.tar" >> "${STAGING}/manifest.txt"
fi

log "packing ${ARCHIVE} ..."
tar -czf "${ARCHIVE}" -C "${BACKUP_DIR}" "$(basename "${STAGING}")"
rm -rf "${STAGING}"

log "archive: $(ls -lh "${ARCHIVE}" | awk '{print $5, $9}')"

if [[ -n "${RCLONE_DEST}" ]]; then
  if ! command -v rclone >/dev/null 2>&1; then
    log "ERROR: RCLONE_DEST is set but rclone is not installed"
    exit 1
  fi
  log "uploading to ${RCLONE_DEST} ..."
  rclone copy "${ARCHIVE}" "${RCLONE_DEST}/" --stats-one-line
  log "upload done"

  if [[ "${RETAIN_REMOTE}" =~ ^[0-9]+$ ]] && [[ "${RETAIN_REMOTE}" -gt 0 ]]; then
    mapfile -t remote_archives < <(
      rclone lsf "${RCLONE_DEST}/" --include "${BACKUP_GLOB}" 2>/dev/null | LC_ALL=C sort -r || true
    )
    if [[ "${#remote_archives[@]}" -gt "${RETAIN_REMOTE}" ]]; then
      for ((i = RETAIN_REMOTE; i < ${#remote_archives[@]}; i++)); do
        log "removing old remote backup: ${remote_archives[i]}"
        rclone delete "${RCLONE_DEST}/${remote_archives[i]}"
      done
    fi
  fi
fi

if [[ "${RETAIN_LOCAL}" == 0 ]]; then
  log "removing local backup(s) (RETAIN_LOCAL=0)"
  rm -f "${BACKUP_DIR}"/${BACKUP_GLOB}
elif [[ "${RETAIN_LOCAL}" =~ ^[0-9]+$ ]]; then
  mapfile -t archives < <(ls -1t "${BACKUP_DIR}"/${BACKUP_GLOB} 2>/dev/null || true)
  if [[ "${#archives[@]}" -gt "${RETAIN_LOCAL}" ]]; then
    for ((i = RETAIN_LOCAL; i < ${#archives[@]}; i++)); do
      log "removing old local backup: ${archives[i]}"
      rm -f "${archives[i]}"
    done
  fi
fi

log "backup complete"
