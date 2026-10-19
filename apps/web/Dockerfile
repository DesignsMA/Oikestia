# Etapa 1: dependencias
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Etapa 2: build
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Hosts permitidos en el middleware: deben existir en build.
ARG APP_PUBLIC_URL=http://localhost:3000
ARG TRUSTED_HOSTS=
ENV APP_PUBLIC_URL=${APP_PUBLIC_URL}
ENV TRUSTED_HOSTS=${TRUSTED_HOSTS}
RUN npm run build

# Etapa 3: runtime
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)throw 1})" || exit 1

CMD ["node", "server.js"]
