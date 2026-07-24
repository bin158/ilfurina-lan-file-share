# Multi-stage Dockerfile for LAN-Share
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and sub-packages package.json
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm install --prefix server
RUN npm install --prefix client

# Copy full application source
COPY . .

# Build Vite client production bundle
RUN npm run build --prefix client

# Final production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy root and server dependencies + built client
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Expose default HTTP port
EXPOSE 3000

# Define persistent volumes for shared files and database
VOLUME ["/app/server/storage", "/app/server/data"]

# Start server
CMD ["node", "server/index.js"]
