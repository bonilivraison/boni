# syntax=docker/dockerfile:1
# Node 24 exécute directement le TypeScript (suppression des types native) : pas d'étape de compilation.

FROM node:24-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run check && npm test

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 DATA_DIR=/data
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Ne copie que le code applicatif (pas les tests), après avoir vérifié qu'ils passent.
COPY --from=test /app/package.json ./
COPY src/app.ts src/index.ts src/rate-limit.ts ./src/
COPY src/inscription ./src/inscription
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
CMD ["node", "src/index.ts"]
