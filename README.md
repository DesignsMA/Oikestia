# Oikestia

Plataforma inmobiliaria para ayudar a los usuarios a encontrar, comprar, rentar y descubrir propiedades en un solo lugar. Los usuarios pueden explorar casas y departamentos, buscar propiedades por ubicación y preferencias, y conectar con oportunidades que coincidan con sus necesidades.

## Estructura del repositorio

```
oikestia/
  apps/web/          Next.js (App Router) + API (route handlers)
  apps/dashboard/    Dash (Python) — estadísticas de propietarios
  legacy/            HTML/CSS estático original, solo como referencia visual
  docker-compose.yml Entorno local: web, dashboard y MongoDB
  docker-compose.prod.yml  Override de producción (ver «Despliegue en producción»)
  scripts/           backup.ps1 / restore.ps1 de MongoDB
  .env.example       Variables de entorno (copiar a .env.local y rellenar)
```

## Desarrollo local

Requisitos: Node.js 22+ y Docker Desktop (para MongoDB).

```bash
cp .env.example .env               # secretos para docker compose
cp .env.example apps/web/.env.local # secretos para npm run dev
docker compose up -d --build       # todo el stack (web en :3000, Dash en :8050)
```

Sin Docker, la app web funciona por sí sola:

```bash
cd apps/web
npm install
npm run dev                       # http://localhost:3000
npm run typecheck
npm run build
```

Al abrir `/publicaciones` por primera vez en una base de datos vacía se siembran
13 publicaciones demo y su propietario:

- usuario: `propietario.demo` · contraseña: `SeedDemo!2026`

## Despliegue en producción

Requisitos: un servidor con Docker Compose y un proxy inverso con HTTPS
(Caddy, nginx o Traefik) delante de los puertos 3000 y 8050.

1. Copia el repositorio y crea `.env` a partir de `.env.example`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   # genera un valor distinto para SESSION_SECRET, DATA_ENCRYPTION_KEY
   # y DASH_HANDOFF_SECRET
   ```

   Variables obligatorias: `APP_PUBLIC_URL=https://tudominio.com`,
   `DASH_PUBLIC_URL=https://dash.tudominio.com`, `TRUSTED_HOSTS` con el dominio
   público (se inyecta en el build del middleware), los tres secretos anteriores
   y `NOMINATIM_CONTACT_EMAIL` (exigido por las normas de uso de Nominatim).

2. Arranca con el override de producción:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

   En este modo: MongoDB no publica puerto, `COOKIE_SECURE=true`,
   `DEV_AUTO_VERIFY=false`, logs con rotación y ambos servicios verifican sus
   secretos al arrancar (si faltan o son débiles, el contenedor sale con error
   en lugar de servir con cifrado inseguro). Cambiar `APP_PUBLIC_URL` o
   `TRUSTED_HOSTS` obliga a reconstruir la imagen web (`--build`).

3. Copias de seguridad de MongoDB:

   ```powershell
   .\scripts\backup.ps1                              # -> backups/*.archive.gz
   .\scripts\restore.ps1 backups\<archivo> -Drop     # restauración (sobrescribe)
   ```

   Ejecútalas desde la raíz con el stack en marcha; programa `backup.ps1` con
   el planificador de tareas o cron.

## Licencia

Ver [LICENSE](LICENSE).
