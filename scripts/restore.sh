#!/bin/bash
# SwiftTok Database Restore Script
# Usage: ./scripts/restore.sh <backup-file>
#
# Restores a SwiftTok database from a .sql.gz backup file.

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh backups/swifttok_*.sql.gz 2>/dev/null || echo "  (none found in ./backups/)"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: File not found: ${BACKUP_FILE}"
  exit 1
fi

# Load DATABASE_URL from .env if available
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-swifttok}"
DB_USER="${DB_USER:-swifttok}"

echo "=== SwiftTok Database Restore ==="
echo "  Source:   ${BACKUP_FILE}"
echo "  Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo ""
echo "WARNING: This will overwrite the current database!"
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Restoring database..."
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${PGPASSWORD:-swifttok}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --quiet

echo "Restore complete!"
echo "=== Done ==="
