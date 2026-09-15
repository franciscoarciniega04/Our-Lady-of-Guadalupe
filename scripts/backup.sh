#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?}" "${BACKUP_BUCKET:?}" "${BACKUP_AGE_RECIPIENT:?}"
task_backup_dir="$(mktemp -d)"
trap 'rm -rf -- "$task_backup_dir"' EXIT
task_backup_name="parish-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges | age -r "$BACKUP_AGE_RECIPIENT" -o "$task_backup_dir/$task_backup_name"
sha256sum "$task_backup_dir/$task_backup_name" > "$task_backup_dir/$task_backup_name.sha256"
aws s3 cp "$task_backup_dir/$task_backup_name" "s3://$BACKUP_BUCKET/parish-backups/$task_backup_name" --sse AES256
aws s3 cp "$task_backup_dir/$task_backup_name.sha256" "s3://$BACKUP_BUCKET/parish-backups/$task_backup_name.sha256" --sse AES256
