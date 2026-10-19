# Oikestia

Plataforma inmobiliaria para ayudar a los usuarios a encontrar, comprar, rentar y descubrir propiedades en un solo lugar. Los usuarios pueden explorar casas y departamentos, buscar propiedades por ubicación y preferencias, y conectar con oportunidades que coincidan con sus necesidades.

## Estructura del repositorio

```
oikestia/
  apps/web/          Next.js (App Router) + API (route handlers)
  apps/dashboard/    Dash (Python) — estadísticas de propietarios
  legacy/            HTML/CSS estático original, solo como referencia visual
  docker-compose.yml Entorno local: web, dashboard y MongoDB
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

## Licencia

Ver [LICENSE](LICENSE).
