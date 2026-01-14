FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy only package files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy dev dependencies for build
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 4000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER appuser

EXPOSE 4000

CMD ["npm", "start"]
