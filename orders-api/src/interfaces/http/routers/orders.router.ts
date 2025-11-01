// src/interfaces/http/routers/orders.router.ts
import { Router } from 'express';
import { ENV } from '../../../config/env.js';

import { MySQLOrderRepository } from '../../../infrastructure/repositories/MySQLOrderRepository.js';
import { ProductMySQLRepository } from '../../../infrastructure/repositories/MySQLProductRepository.js';
import { MySQLIdempotencyRepository } from '../../../infrastructure/repositories/MySQLIdempotencyRepository.js';

import { CreateOrderUseCase } from '../../../application/usecases/CreateOrderUseCase.js';
import { ConfirmOrderUseCase } from '../../../application/usecases/ConfirmOrderUseCase.js';
import { jwtAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Instancias repos
const ordersRepo = new MySQLOrderRepository();
const productRepo = new ProductMySQLRepository();
const idempotencyRepo = new MySQLIdempotencyRepository();

// Health
router.get('/health', (_req, res) => res.json({ ok: true }));

// Listar
router.get('/orders', async (req, res) => {
    const { status, from, to, limit = '20', cursor } = req.query as any;

    const limNum = Number(limit);
    const safeLimit = Number.isFinite(limNum) && limNum > 0 ? Math.floor(limNum) : 20;

    const curNum = cursor !== undefined && cursor !== null && String(cursor).trim() !== ''
        ? Number(cursor)
        : undefined;

    const st = (status as string | undefined)?.toUpperCase();
    const allowed = new Set(['CREATED', 'CONFIRMED', 'CANCELED']);
    const safeStatus: 'CREATED' | 'CONFIRMED' | 'CANCELED' | undefined =
        st && allowed.has(st) ? (st as any) : undefined;

    try {
        const out = await ordersRepo.list({
            status: safeStatus,
            from: from as string | undefined,
            to: to as string | undefined,
            limit: safeLimit,
            cursor: curNum,
        });
        res.json(out);
    } catch (e: any) {
        console.error('GET /orders error:', e);
        res.status(400).json({ error: e.message });
    }
});

// Detalle
router.get('/orders/:id', jwtAuth, async (req, res) => {
    const o = await ordersRepo.getById(Number(req.params.id));
    if (!o) return res.status(404).json({ error: 'Not found' });
    res.json(o);
});

router.post('/orders', jwtAuth, async (req, res) => {
    try {
        const base = ENV.customersInternalBase!;
        const resp = await fetch(`${base}/internal/customers/${req.body.customer_id}`, {
            headers: { Authorization: `Bearer ${ENV.serviceToken}` },
        });
        if (!resp.ok) return res.status(400).json({ error: 'Problems with customer' });

        const createKey = req.header('X-Idempotency-Key') || null;
        const createType = 'order_create' as const;

        if (createKey) {
            const existing = await idempotencyRepo.find(createKey, createType);
            if (existing && existing.response_body) {
                try { return res.status(201).json(JSON.parse(existing.response_body)); }
                catch { return res.status(201).json(existing.response_body); }
            }
        }

        // Crear
        const uc = new CreateOrderUseCase(productRepo, ordersRepo);
        const order = await uc.execute(req.body);

        if (createKey) {
            await idempotencyRepo.save({
                key: createKey,
                target_type: createType,
                target_id: order.id,
                status: 'SUCCEEDED',
                response_body: JSON.stringify(order),
            });
        }

        res.status(201).json(order);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});


router.post('/orders/:id/confirm', jwtAuth, async (req, res) => {
    try {
        const key = req.header('X-Idempotency-Key');
        if (!key) return res.status(400).json({ error: 'Missing X-Idempotency-Key' });

        const uc = new ConfirmOrderUseCase(ordersRepo, idempotencyRepo);
        const out = await uc.execute(Number(req.params.id), key);
        res.json(out);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Cancelar
router.post('/orders/:id/cancel', jwtAuth, async (req, res) => {
    try {
        const out = await ordersRepo.cancel(Number(req.params.id));
        res.json(out);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

export default router;
