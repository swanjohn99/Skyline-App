# Deployment

Guide to building and hosting Skyline-App in production. The app has two parts:

1. **Frontend** — a static React SPA served under `/app/`
2. **Backend** — a PHP API served under `/api/`, backed by MariaDB

Both are served from the same origin (`https://skylineconstructions.in`) so the session cookie is shared.

---

## 1. Database

On the production MariaDB server:

```bash
mysql -u <admin> -p -e "CREATE DATABASE skyline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u <admin> -p skyline < api/schema.sql
```

Create a dedicated DB user with privileges limited to the `skyline` database.

---

## 2. Backend (PHP API)

1. Upload the `api/` folder to the web root so it is reachable at `/api/`.
2. Create `api/.env` on the server (never commit it) from `api/.env.example`:
   - DB credentials
   - `APP_URL=https://skylineconstructions.in/app`
   - SMTP settings for password-reset emails
3. Ensure PHP 8.1+ with `pdo_mysql` and `openssl` is enabled.
4. The included `api/.htaccess` routes `/api/*` to `index.php` and blocks direct access to `.env`, `.sql`, and `config.php` (Apache + mod_rewrite). For Nginx, see the snippet below.

---

## 3. Frontend build

```bash
npm run build
```

Output: `dist/`. Vite sets `base: '/app/'` for builds, so assets load from `/app/assets/...` and React Router uses `basename="/app"`. Upload the contents of `dist/` to the directory served at `/app/`.

---

## Web server configuration

### Apache

`api/.htaccess` is included. For the SPA, add an `.htaccess` under `/app/` (or a vhost rule):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /app/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /app/index.html [L]
</IfModule>
```

### Nginx

```nginx
# PHP API
location /api/ {
  try_files $uri /api/index.php$is_args$args;
}
location ~ ^/api/.*\.php$ {
  include fastcgi_params;
  fastcgi_pass unix:/run/php/php8.1-fpm.sock;
  fastcgi_param SCRIPT_FILENAME $document_root/api/index.php;
}
# Block sensitive files
location ~ /api/.*\.(env|sql)$ { deny all; }
location = /api/config.php { deny all; }

# SPA
location /app/ {
  alias /var/www/skyline-app/dist/;
  try_files $uri $uri/ /app/index.html;
}
```

---

## Password-reset emails

`POST /api/auth/forgot-password` emails a one-hour link to `APP_URL/reset?token=...`. Configure `SMTP_*` in `api/.env`; if `SMTP_HOST` is empty the API falls back to PHP `mail()`.

---

## Deployment checklist

- [ ] Create production DB and load `api/schema.sql`
- [ ] Upload `api/` and create `api/.env` (DB + `APP_URL` + SMTP)
- [ ] Confirm `/api/` returns `{"status":"ok"}` and `.env`/`.sql` are not publicly accessible
- [ ] `npm run build` and upload `dist/` to `/app/`
- [ ] Configure SPA fallback so `/app/...` deep links work on refresh
- [ ] Verify sign up / sign in, then CRUD on projects/expenses/payments
- [ ] Verify forgot-password email arrives and reset works
- [ ] Seed the super admin (see bottom of `api/schema.sql`)
- [ ] Confirm `.env` and `api/.env` are git-ignored

---

## Related docs

- Local development: [06-local-setup.md](./06-local-setup.md)
- Architecture: [02-architecture.md](./02-architecture.md)
