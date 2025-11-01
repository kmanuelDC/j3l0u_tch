# Etapa 1: dependencias
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && cp -r node_modules /tmp/prod_node_modules && npm ci

# Etapa 2: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Etapa 3: ejecución
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
RUN apk add --no-cache wget
COPY package*.json ./
COPY --from=deps /tmp/prod_node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3002
USER nodeuser
CMD ["node", "dist/server.js"]
