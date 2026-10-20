# Multi-stage Docker build for TrustVault Zero-Trust Platform
FROM node:22-alpine AS builder

WORKDIR /app

# Build Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend ./frontend
RUN cd frontend && npm run build

# Build Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend ./backend
RUN cd backend && npx prisma generate && npm run build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL="file:./dev.db"
ENV STORAGE_DIR="./storage/private"
ENV JWT_SECRET="trustvault-production-secure-jwt-key-32chars"
ENV ENCRYPTION_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Copy backend dependencies and build
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/prisma ./backend/prisma

# Copy built frontend assets to static distribution folder
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 5000

WORKDIR /app/backend
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && node dist/server.js"]
