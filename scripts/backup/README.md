# Skyline backup scripts

Daily MariaDB dumps and server file archives for production.

## What gets backed up

| Output | Contents |
|--------|----------|
| `db/skyline_YYYY-MM-DD.sql.gz` | Full MariaDB dump |
| `files/skyline_files_YYYY-MM-DD.tar.gz` | `api/` (incl. `uploads/logos`, `.env`), `app/` or `dist/` |

Retention: **14 days** local (configurable). Optional offsite via rclone or AWS CLI.

## First-time server setup

### 1. Create backup directory

```bash
sudo mkdir -p /var/backups/skyline/{db,files}
sudo chown "$USER:$USER" /var/backups/skyline
chmod 700 /var/backups/skyline
```

Backups must live **outside** `public_html`.

### 2. Configure

```bash
cd /path/to/skyline/scripts/backup
cp backup.conf.example backup.conf
chmod 600 backup.conf
# Edit BACKUP_ROOT, WEB_ROOT, ENV_FILE
```

### 3. Make scripts executable

```bash
chmod +x backup-all.sh backup-db.sh backup-files.sh restore-db.sh restore-files.sh
```

### 4. Test manually

```bash
./backup-all.sh
ls -lh /var/backups/skyline/db/
ls -lh /var/backups/skyline/files/
tail /var/backups/skyline/backup.log
```

### 5. Cron (daily 02:00)

```cron
0 2 * * * /path/to/skyline/scripts/backup/backup-all.sh >> /var/backups/skyline/cron.log 2>&1
```

cPanel: **Cron Jobs** → same command if shell access is enabled.

### 6. Offsite sync (recommended)

**rclone** (S3, B2, Google Drive):

```bash
rclone config   # create remote e.g. skyline-backups
```

In `backup.conf`:

```
OFFSITE_ENABLED=1
RCLONE_REMOTE="skyline-backups"
RCLONE_DEST="skyline"
```

**AWS S3**:

```
OFFSITE_ENABLED=1
S3_BUCKET="my-bucket"
S3_PREFIX="skyline"
```

Requires `aws` CLI configured on the server.

## Restore

See [docs/09-backups-and-restore.md](../../docs/09-backups-and-restore.md).

Quick test (non-destructive DB check):

```bash
gunzip -c /var/backups/skyline/db/skyline_2026-06-20.sql.gz | head -50
tar -tzf /var/backups/skyline/files/skyline_files_2026-06-20.tar.gz | head
```

## Files

| Script | Purpose |
|--------|---------|
| `backup-all.sh` | DB + files + retention + offsite |
| `backup-db.sh` | mysqldump only |
| `backup-files.sh` | tar archive only |
| `restore-db.sh` | Restore database (interactive confirm) |
| `restore-files.sh` | Restore files (interactive confirm) |
| `_common.sh` | Shared config/logging |
| `backup.conf.example` | Template (copy to `backup.conf`, gitignored) |
