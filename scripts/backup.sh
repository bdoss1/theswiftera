#!/bin/bash
# SwiftTok Database Backup Script
# Usage: ./scripts/backup.sh [output-dir]
#
# Creates a timestamped pg_dump backup of the SwiftTok database.
# Stores backups in the specified directory (default: ./backups)
# Automatically removes backups older than 30 days.

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/swifttok_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Load DATABASE_URL from .env if available
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

# Default connection params
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-swifttok}"
DB_USER="${DB_USER:-swifttok}"

echo "=== SwiftTok Database Backup ==="
echo "  Timestamp: ${TIMESTAMP}"
echo "  Database:  ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "  Output:    ${BACKUP_FILE}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Run backup
echo "Starting backup..."
PGPASSWORD="${PGPASSWORD:-swifttok}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_FILE}"

FILESIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# Clean up old backups
echo ""
echo "Removing backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "${BACKUP_DIR}" -name "swifttok_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "Removed ${DELETED} old backup(s)"

# List existing backups
echo ""
echo "Current backups:"
ls -lh "${BACKUP_DIR}"/swifttok_*.sql.gz 2>/dev/null || echo "  (none)"
echo ""
echo "=== Done ==="
