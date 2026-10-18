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

## Estado de la migración

Plan completo en proceso de implementación por fases (0 a 9). Estado actual: **Fase 7**.

- Fase 0 — Monorepo, compose con Mongo, `.env.example` ✅
- Fase 1 — UI migrada a Next con datos de ejemplo ✅
- Fase 2 — Cuentas: Mongo, cifrado AES-256-GCM + Argon2id, registro, login con
  correo o usuario, sesiones con cookie httpOnly, selección de intereses (mín. 3) ✅
- Fase 3 — Publicaciones: Mongo + GridFS (fotos y documentos), catálogo público,
  ficha de detalle con mapa OSM, contacto/visitas (leads), panel de propietario
  con verificación de identidad y asistente de publicación en 5 pasos ✅
- Fase 4 — Búsqueda: filtros del catálogo por query string (texto insensible a
  acentos, tipo, operación, precio, recámaras, amenidades, orden) con chips
  activos, y geocodificación de direcciones nuevas con Nominatim (cascada de
  variantes, 1 req/s, `GEOCODER=off` para pruebas sin red) ✅
- Fase 5 — Buscador en mapa `/buscar`: Leaflet con tiles OSM, radio de
  búsqueda (1-50 km), geolocalización del navegador, salto por dirección vía
  proxy `/api/geocode` (Nominatim desde el servidor) y lista de cards con
  marcadores; acepta `?lat&lng&radio` para enlazar. `?NOMINATIM_CONTACT_EMAIL`
  recomendado en producción (política de uso de OpenStreetMap). ✅
- Fase 6 — Mensajes `/mensajes`: conversación única por lead (contacto o
  visita), hilo con mensajes, estados `nuevo`/`respondido`, badges de no
  leídos, API `/api/leads` y `/api/mensajes` con autorización por
  participante (403 para terceros), polling del panel (5 s/4 s) y siembra
  del mensaje inicial en el contacto. ✅
- Fase 7 — Dashboard de estadísticas (`:8050`, Dash + Plotly): acceso por
  token HMAC-SHA256 de traspaso desde el panel (`/api/dashboard`, 5 min)
  con cookie httpOnly de 8 h, métricas reales de Mongo (sitio: usuarios,
  publicaciones, leads, mensajes; del propietario: publicaciones por
  estado/operación, interesados por día, sin responder, visitas, mensajes)
  con gráficas y tablas. `DASH_HANDOFF_SECRET` compartido entre web y
  dashboard. ✅
- Fases 8-9 — Endurecimiento, producción — pendientes

## Licencia

Ver [LICENSE](LICENSE).
