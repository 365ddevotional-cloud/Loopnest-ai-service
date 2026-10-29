FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_MINISTRIUM_FIREBASE_API_KEY
ARG VITE_MINISTRIUM_FIREBASE_AUTH_DOMAIN
ARG VITE_MINISTRIUM_FIREBASE_PROJECT_ID
ARG VITE_MINISTRIUM_FIREBASE_APP_ID
RUN npm run check && npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/migrations ./migrations
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build --chown=node:node /app/server/database.mjs /app/server/policy.mjs /app/server/migrations.mjs ./server/
USER node
EXPOSE 8080
CMD ["node","dist/server.cjs"]
