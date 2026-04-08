FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .
EXPOSE 8787
CMD ["npx", "wrangler", "dev", "--ip", "0.0.0.0"]
