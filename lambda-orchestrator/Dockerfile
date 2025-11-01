# ========== STAGE 1: deps ==========
FROM node:20-alpine AS deps
WORKDIR /app

# Copia manifiestos (si hay package-lock.json también se copiará)
COPY package*.json ./

# Si existe package-lock.json => npm ci, si no => npm install
RUN if [ -f package-lock.json ]; then \
    npm ci ; \
    else \
    npm install --no-audit --no-fund ; \
    fi

# ========== STAGE 2: build ==========
FROM node:20-alpine AS build
WORKDIR /app

# Trae node_modules de deps (con dev deps, para compilar TypeScript)
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ========== STAGE 3: runner ==========
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Usuario no root y wget para healthcheck del compose
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs \
    && apk add --no-cache wget

# Manifiestos para instalar SOLO prod deps
COPY package*.json ./

# Instala solo deps de producción (con o sin lockfile)
RUN if [ -f package-lock.json ]; then \
    npm ci --omit=dev ; \
    else \
    npm install --omit=dev --no-audit --no-fund ; \
    fi

# Copia el build
COPY --from=build /app/dist ./dist

EXPOSE 3003
USER nodeuser
CMD ["node", "dist/server.js"]
