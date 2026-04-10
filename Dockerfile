FROM node:20-alpine AS base

# Install dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_PATH=/app/data/luma.db
RUN mkdir -p /app/data
RUN npm run build

# --- Production ---
FROM node:20-alpine AS runner
WORKDIR /app

# Install better-sqlite3 native dependency
RUN apk add --no-cache libstdc++

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data/luma.db

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create data directory writable by anyone (volume will mount here)
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 3000

CMD ["node", "server.js"]
