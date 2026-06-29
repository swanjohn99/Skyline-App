# Backups and restore

Daily automated backups for production: MariaDB database + server files (API, uploads, config, SPA).

Scripts live in [`scripts/backup/`](../scripts/backup/). See [`scripts/backup/README.md`](../scripts/backup/README.md) for quick setup.

---

## What is backed up

| Asset | Location in backup | Priority |
|-------|-------------------|----------|
| MariaDB database | `BACKUP_ROOT/db/skyline_YYYY-MM-DD.sql.gz` | Critical |
| `api/uploads/logos/` | Inside files tar | Critical |
| `api/.env` | Inside files tar | Critical |
| `api/` PHP code | Inside files tar | High |
| `app/` or `dist/` SPA | Inside files tar | Medium |

**Schedule:** daily at 02:00 server time via cron (configurable).

**Retention:** 14 days local (set `RETENTION_DAYS` in `backup.conf`).

**Offsite:** optional rclone or S3 sync after each successful run.

---

## First-time setup

### 1. Backup directory (outside web root)

```bash
sudo mkdir -p /var/backups/skyline/{db,files}
sudo chown <deploy-user>:<deploy-user> /var/backups/skyline
chmod 700 /var/backups/skyline
```

Never store backups under `public_html`. Dumps contain full DB data; file archives include `api/.env`.

### 2. Configure scripts

On the server (or upload repo and point cron at it):

```bash
cd /path/to/skyline/scripts/backup
cp backup.conf.example backup.conf
chmod 600 backup.conf
```

Edit `backup.conf`:

- `BACKUP_ROOT` — e.g. `/var/backups/skyline`
- `WEB_ROOT` — e.g. `/home/user/public_html`
- `ENV_FILE` — e.g. `/home/user/public_html/api/.env`

DB credentials are read from `ENV_FILE` (same vars as [`api/.env.example`](../api/.env.example)).

### 3. Test run

```bash
chmod +x *.sh
./backup-all.sh
ls -lh /var/backups/skyline/db/
ls -lh /var/backups/skyline/files/
tail /var/backups/skyline/backup.log
```

### 4. Cron

**VPS / SSH:**

```cron
0 2 * * * /path/to/skyline/scripts/backup/backup-all.sh >> /var/backups/skyline/cron.log 2>&1
```

**cPanel:** Cron Jobs → same command if shell cron is available.

If `mysqldump` is blocked on shared hosting, use the host’s backup tool (JetBackup / Backup Wizard) **and** request shell access for DB-only dumps, or export via phpMyAdmin as a manual fallback (not a substitute for daily automation).

### 5. Offsite copy (recommended)

After local backup succeeds, sync to external storage so a server loss does not lose data.

**rclone** (S3, Backblaze B2, Google Drive):

```bash
rclone config   # e.g. remote name: skyline-backups
```

In `backup.conf`:

```
OFFSITE_ENABLED=1
RCLONE_REMOTE="skyline-backups"
RCLONE_DEST="skyline"
```

**AWS S3:**

```
OFFSITE_ENABLED=1
S3_BUCKET="my-bucket"
S3_PREFIX="skyline"
```

Keep offsite retention ≥ local (30 days for DB-only offsite is reasonable).

---

## Restore runbook

### Before you start

- Note the backup date to restore (`skyline_YYYY-MM-DD.sql.gz` / `skyline_files_YYYY-MM-DD.tar.gz`).
- Prefer restoring to a **test database** first on staging.
- Put the app in maintenance mode or stop cron during restore if possible.

### Restore database

```bash
cd /path/to/skyline/scripts/backup
./restore-db.sh /var/backups/skyline/db/skyline_2026-06-20.sql.gz
```

Type `YES` when prompted. This overwrites the database named in `api/.env`.

**Test DB (non-destructive check):**

```bash
mysql -u root -p -e "CREATE DATABASE skyline_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
gunzip -c /var/backups/skyline/db/skyline_2026-06-20.sql.gz | mysql -u root -p skyline_restore_test
mysql -u root -p skyline_restore_test -e "SELECT COUNT(*) FROM users;"
```

### Restore files

```bash
./restore-files.sh /var/backups/skyline/files/skyline_files_2026-06-20.tar.gz
```

Prompts separately for:

- `api/` (code + `uploads/logos/`)
- `api/.env`
- `app/` or `dist/`

Ensure `api/uploads/logos/` is writable by PHP after restore:

```bash
chmod 755 /path/to/public_html/api/uploads/logos
```

### Verify after restore

1. `GET /api/` returns `{"status":"ok"}`
2. Sign in with a known user
3. Dashboard loads projects/expenses
4. Company logos display (`/api/uploads/logos/...`)
5. Forgot-password email still works (check `api/.env` SMTP)

---

## Verification checklist (once after setup)

- [ ] Manual `./backup-all.sh` completes without errors
- [ ] Files exist in `BACKUP_ROOT/db/` and `BACKUP_ROOT/files/`
- [ ] `gzip -t` on latest DB dump passes
- [ ] `tar -tzf` on latest files archive lists `api/uploads/logos/`
- [ ] Restore DB to **test** database; row counts look sane
- [ ] Cron entry added; check `cron.log` next morning
- [ ] Offsite sync confirmed (if enabled)

---

## Limitations

- **Point-in-time:** recovery is only as of the last successful nightly backup.
- **Disk space:** scripts warn when the backup partition exceeds 80% full; monitor `/var/backups`.
- **Shared NAT IPs:** unrelated to backups; see single-IP login docs if applicable.
- Do not commit `scripts/backup/backup.conf` — only `backup.conf.example` belongs in git.

---

## Related docs

- Deployment: [07-deployment.md](./07-deployment.md)
- Script reference: [scripts/backup/README.md](../scripts/backup/README.md)
