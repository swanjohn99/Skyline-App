# Deployment

Guide to building and hosting Skyline-App in production.

---

## Build output

Skyline-App is a **static single-page application**. Production deployment is:

1. Run `npm run build`
2. Upload the `dist/` folder to any static file host
3. Configure SPA fallback (all routes → `index.html`)

No server-side runtime required.

---

## Build command

```bash
npm run build
```

Output directory: `dist/`

Preview locally before deploying:

```bash
npm run preview
```

---

## Environment variables at build time

Vite **inlines** `VITE_*` environment variables during the build. They must be set **before** running `npm run build`.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

**CI/CD pattern:**

```yaml
# Example (GitHub Actions)
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
run: npm run build
```

Never commit production keys to the repository.

---

## Intended production URL

**Target:** `https://skylineconstructions.in/app/`

The app is hosted under the `/app/` subpath, not at the domain root.

`package.json` declares:

```json
"homepage": "https://skylineconstructions.in/app/"
```

---

## Subpath configuration (required fix)

The current codebase has a **deployment gap**: `homepage` is set but Vite `base` and React Router `basename` are not configured. Without these, assets and client-side routes break under `/app/`.

### Required changes for subpath deployment

**1. `vite.config.js` — set asset base path:**

```js
export default defineConfig({
  base: '/app/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
```

**2. `src/App.jsx` — set router basename:**

```jsx
<BrowserRouter basename="/app">
  {/* ... */}
</BrowserRouter>
```

**3. Verify links and assets:**

- All JS/CSS bundles load from `/app/assets/...`
- Navigating to `/app/projects` works on direct URL access (requires server SPA fallback)

### Local development note

With `base: '/app/'`, local dev runs at `http://localhost:5173/app/` instead of root. Alternatively, use environment-specific config:

```js
base: process.env.NODE_ENV === 'production' ? '/app/' : '/',
```

And conditionally set `basename` only in production.

---

## Static host SPA fallback

The server must return `index.html` for all routes under `/app/` so React Router can handle client-side routing.

### Nginx example

```nginx
location /app/ {
  alias /var/www/skyline-app/dist/;
  try_files $uri $uri/ /app/index.html;
}
```

### Apache example

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

### Netlify

Create `public/_redirects` or `netlify.toml`:

```
/app/*  /app/index.html  200
```

### GitHub Pages

If deploying to `username.github.io/repo-name/`, set `base` to `/repo-name/` and enable SPA routing via `404.html` trick or GitHub Actions.

---

## Hosting options

| Platform | Notes |
|----------|-------|
| **Nginx / Apache** | Full control; place `dist/` on server |
| **Netlify / Vercel** | Connect repo; set build command and env vars |
| **GitHub Pages** | Free static hosting; configure `base` path |
| **Cloudflare Pages** | Similar to Netlify |
| **AWS S3 + CloudFront** | Enterprise static hosting |

All options work because the app has no server-side requirements.

---

## Supabase in production

- Use the **same Supabase project** or a dedicated production project
- Restrict anon key exposure — it is embedded in the client bundle (unavoidable for SPAs)
- **Strongly recommended:** add Supabase Auth and tighten RLS before public deployment
- Enable Supabase dashboard monitoring and backups

Current anon RLS policies allow unrestricted read/write. See [03-database-schema.md](./03-database-schema.md).

---

## Deployment checklist

- [ ] Set production `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in CI/host
- [ ] Configure `base: '/app/'` in Vite (or appropriate path)
- [ ] Configure `basename="/app"` on `BrowserRouter`
- [ ] Run `npm run build` successfully
- [ ] Upload / deploy `dist/` contents
- [ ] Configure SPA fallback on web server
- [ ] Verify `/app/` loads dashboard
- [ ] Verify direct URL access to `/app/projects` works (refresh test)
- [ ] Verify Supabase CRUD operations from production URL
- [ ] Confirm `.env` is not committed to git

---

## Current state vs target

| Item | Current | Target for production |
|------|---------|----------------------|
| `package.json homepage` | `/app/` | OK |
| Vite `base` | `/` (default) | `/app/` |
| Router `basename` | none | `/app` |
| Auth | none | recommended |
| RLS | permissive anon | auth-scoped (recommended) |

---

## Related docs

- Local development: [06-local-setup.md](./06-local-setup.md)
- Database setup: [03-database-schema.md](./03-database-schema.md)
- Full rebuild: [08-replication-checklist.md](./08-replication-checklist.md)
