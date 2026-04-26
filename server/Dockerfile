FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY --from=build /app/dist ./dist
COPY scripts ./scripts
COPY sql ./sql
COPY tsconfig.json ./

RUN mkdir -p /app/logs /app/backups /app/uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "scripts/docker-bootstrap.js"]
