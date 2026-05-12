# syntax=docker/dockerfile:1.6
# Prisma: glibc (bookworm) — Alpine musl bilan engine muammolarini oldini oladi.
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY scripts ./scripts
COPY . .

ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL
# `next build` production assert: image buildda haqiqiy domen yo‘q — faqat builder bosqichida.
ARG AUTH_SECRET="docker-build-placeholder-secret-min-32-chars-xx"
ENV AUTH_SECRET=$AUTH_SECRET
ENV SKIP_PRODUCTION_HTTPS_ENFORCEMENT=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

RUN chmod +x /app/scripts/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
