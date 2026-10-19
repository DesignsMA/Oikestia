# Oikestia

Real estate platform: property catalog, map search, owner dashboard, and messaging between owners and prospects.

- **apps/web** — Next.js 15 (App Router) with route handlers as API, MongoDB + GridFS, server-rendered pages in Spanish.
- **apps/dashboard** — Dash (Python) owner statistics, served by Gunicorn and protected by an HMAC handoff cookie from the web app.
- **legacy** — original static HTML/CSS kept only as a visual reference.

## Repository layout

```
apps/web/
  app/(auth)/          login, registration, interests
  app/(main)/          home, catalog, listing detail, search, messages, owner panel
  app/api/             route handlers (auth, listings, leads, messages, photos, geocode, ...)
  app/styles/          one CSS file per view (no CSS framework)
  components/          React components (client components are marked "use client")
  lib/                 domain layer: db, auth, crypto, validation, rate limiting
  middleware.ts        /api guards: allowed hosts, HTTP methods, origin checks
  instrumentation.ts   startup config validation (APP_ENV=production only)
apps/dashboard/
  app.py               Dash app and route guards
  entorno.py           startup config validation
  stats.py, auth.py    queries and HMAC tokens
docker-compose.yml         local stack: web (:3000), dashboard (:8050), mongo
docker-compose.prod.yml    production override
scripts/                   MongoDB backup/restore (PowerShell)
```

## Local development

Requirements: Node.js 22+, Docker (MongoDB).

```bash
cp .env.example .env                # secrets for docker compose
cp .env.example apps/web/.env.local # secrets for npm run dev
docker compose up -d --build
```

Web app without Docker:

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

On first visit to `/publicaciones` against an empty database, the seed creates 13 demo listings and owner `propietario.demo` / `SeedDemo!2026`.

Key environment variables (full list in `.env.example`): `SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, `DASH_HANDOFF_SECRET` (32+ bytes each), `APP_PUBLIC_URL`, `TRUSTED_HOSTS`, `DEV_AUTO_VERIFY` (dev only), `COOKIE_SECURE`.

## Production

Run behind a reverse proxy that terminates HTTPS (ports 3000 and 8050).

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # one per secret
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The production override: does not publish the MongoDB port, forces `COOKIE_SECURE=true` and `DEV_AUTO_VERIFY=false`, rotates container logs, and both services refuse to start if `APP_PUBLIC_URL`/`DASH_PUBLIC_URL` are missing, are not `https://`, or the secrets are shorter than 32 bytes. `TRUSTED_HOSTS` and `APP_PUBLIC_URL` are baked into the web image at build time — rebuild after changing them.

`NOMINATIM_CONTACT_EMAIL` is required in production (Nominatim usage policy).

## Database backup

```powershell
.\scripts\backup.ps1                             # -> backups/*.archive.gz
.\scripts\restore.ps1 backups\<file> -Drop       # overwrite restore
```

`backups/` is gitignored. Schedule `backup.ps1` via Task Scheduler or cron.

## License

See [LICENSE](LICENSE).
