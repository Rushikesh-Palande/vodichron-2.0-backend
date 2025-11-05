# Multi-stage Dockerfile for Vodichron HRMS Backend
# ================================================
# Stage 1: Build
# Stage 2: Runtime
# Uses Node.js 20-alpine with security patches

# ============================================================
# Stage 1: Build Stage
# ============================================================
FROM node:20-alpine3.19 AS builder

# Set working directory
WORKDIR /app

# Update and install security patches
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with security audit
RUN npm ci && npm audit fix --production

# Copy source code
COPY src ./src

# Build application
RUN npm run build

# ============================================================
# Stage 2: Runtime Stage
# ============================================================
FROM node:20-alpine3.19

# Set working directory
WORKDIR /app

# Update and install security patches
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache dumb-init ca-certificates tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create logs and assets directories
RUN mkdir -p logs assets && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
