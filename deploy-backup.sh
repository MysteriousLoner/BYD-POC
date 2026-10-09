#!/bin/sh
set -eu
umask 077
backup_dir=/opt/byd-backups
stamp=$(date -u +%Y%m%d-%H%M%S)
stage=$(mktemp -d /opt/byd-backups/staging.XXXXXX)
trap 'rmdir "$stage" 2>/dev/null || true' EXIT
docker exec byd-website node server/backup.js "/app/runtime/backups/byd-$stamp.sqlite"
docker cp "byd-website:/app/runtime/backups/byd-$stamp.sqlite" "$stage/database.sqlite"
docker cp byd-website:/app/uploads "$stage/uploads"
tar -czf "$backup_dir/byd-$stamp.tar.gz" -C "$stage" .
docker exec byd-website node -e 'require("fs").unlinkSync(process.argv[1])' "/app/runtime/backups/byd-$stamp.sqlite"
# Remove only this job's validated, unique staging directory after successful archival.
case "$stage" in /opt/byd-backups/staging.*) rm -r -- "$stage" ;; *) exit 1 ;; esac
find /opt/byd-backups -maxdepth 1 -type f -name 'byd-????????-??????.tar.gz' -mtime +29 -delete
