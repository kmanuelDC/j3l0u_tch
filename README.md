# B2B Orders Monorepo

## Levantar local
1. Copiar `.env.example` → `.env` en `customers-api` y `orders-api`.
2. `docker-compose build && docker-compose up -d`
3. Probar health:
   - Customers: http://localhost:3001/health
   - Orders: http://localhost:3002/health

## JWT quick
- Genera un JWT con `JWT_SECRET` para probar endpoints protegidos.
- Para `/internal` de Customers usa `Authorization: Bearer SERVICE_TOKEN`.

## Tests
- `npm test` dentro de cada servicio (Vitest).
```

---

## 9) Siguiente hito (lo haremos después): Lambda Orchestrator

- **serverless-offline** para `POST /orchestrator/create-and-confirm-order`.
- Flujo: valida cliente → crea orden → confirma con `X-Idempotency-Key` → responde consolidado.
- Se parametriza con `CUSTOMERS_API_BASE` y `ORDERS_API_BASE`.

---

## 10) Roadmap de implementación (paso a paso)

1. **DB**: aplicar `schema.sql` y `seed.sql` (Docker inicia automáticamente).
2. **Customers API**: completar wiring (app/server), CRUD mínimo, `/internal`, OpenAPI, pruebas unitarias de UseCases.
3. **Orders API**: implementar `ProductRepository`, `IdempotencyRepository`, completar routers, transacciones, OpenAPI y pruebas de casos clave (crear, confirmar, cancelar).
4. **End-to-End local**: probar `POST /orders` + `POST /orders/:id/confirm` con `X-Idempotency-Key`.
5. **Lambda** (al final): `serverless-offline`, integración HTTP con ambos servicios, y respuesta consolidada.
