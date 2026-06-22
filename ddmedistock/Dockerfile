# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# DDMediStock — production image (multi-stage).
# Stages: deps → builder → runner. The final image ships only Next.js's
# standalone output + Prisma engines, runs as a non-root user, and contains no
# build toolchain or dev dependencies.
# ─────────────────────────────────────────────────────────────────────────────

# ── deps: install all dependencies (incl. dev) for the build ──────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# libc compat for Prisma's engine binaries on Alpine.
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci

# ── builder: generate Prisma client and build Next.js ─────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is not needed to build; a dummy keeps Prisma generate happy.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
# Emit Next.js standalone output for the image (consumed by the runner stage).
ENV DOCKER_BUILD=1
RUN npx prisma generate
RUN npm run build

# ── runner: minimal production runtime ────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
# openssl: Prisma engines. tesseract-ocr + poppler-utils: OCR pipeline
# (image/scanned-PDF text extraction). ttf-dejavu: glyphs for rendering.
RUN apk add --no-cache openssl tesseract-ocr poppler-utils ttf-dejavu
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Non-root user.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Next.js standalone server + static assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + migrations + generated client + engines, so the container can
# run `prisma migrate deploy` at startup and query the DB.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000

# Lightweight healthcheck against the Next.js server.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
