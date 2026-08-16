# --- STAGE 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package dependency definitions
COPY package.json yarn.lock ./

# Install dependencies deterministically
RUN yarn install --frozen-lockfile

# --- STAGE 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables for Next.js (client-side inlining)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js production assets (standalone mode)
RUN yarn build

# --- STAGE 3: Production Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for PID 1 signal forwarding (SIGTERM / SIGINT)
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security best practice: Create and run application as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Use dumb-init as entrypoint wrapper for proper PID 1 signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "server.js"]
