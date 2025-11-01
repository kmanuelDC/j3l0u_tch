# ========== STAGE 1: deps ==========
FROM node:20-alpine AS deps
WORKDIR /app


COPY package*.json ./


RUN if [ -f package-lock.json ]; then \
    npm ci ; \
    else \
    npm install --no-audit --no-fund ; \
    fi


FROM node:20-alpine AS build
WORKDIR /app


COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build


FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app


RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs \
    && apk add --no-cache wget


COPY package*.json ./


RUN if [ -f package-lock.json ]; then \
    npm ci --omit=dev ; \
    else \
    npm install --omit=dev --no-audit --no-fund ; \
    fi


COPY --from=build /app/dist ./dist

EXPOSE 3003
USER nodeuser
CMD ["node", "dist/server.js"]
