# Etapa 1: dependencias
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && cp -r node_modules /tmp/prod_node_modules && npm ci

# Etapa 2: build
FROM node:20-alpine AS build
WORKDIR /app
# Necesario para que npm run build exista
COPY package*.json ./
# Trae node_modules (incluye dev deps porque los preinstalaste en deps)
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Etapa 3: ejecución
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
# usuario no root
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
# healthcheck del compose usa wget
RUN apk add --no-cache wget
COPY package*.json ./
COPY --from=deps /tmp/prod_node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3001
USER nodeuser
CMD ["node", "dist/server.js"]
