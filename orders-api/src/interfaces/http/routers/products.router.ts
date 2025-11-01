// src/interfaces/http/routers/products.router.ts
import { Router } from 'express';
import { z } from 'zod';
import { jwtAuth } from '../middlewares/auth.middleware.js';
import { ProductMySQLRepository } from '../../../infrastructure/repositories/MySQLProductRepository.js';

const router = Router();
const repo = new ProductMySQLRepository();

const CreateSchema = z.object({
    sku: z.string().trim().min(1),
    name: z.string().trim().min(1),
    price_cents: z.number().int().positive(),
    stock: z.number().int().nonnegative(),
});

const PatchSchema = z.object({
    price_cents: z.number().int().positive().optional(),
    stock: z.number().int().nonnegative().optional(),
}).refine(o => Object.keys(o).length > 0, { message: 'Nothing to update' });

router.post('/products', jwtAuth, async (req, res) => {
    try {
        const data = CreateSchema.parse(req.body);
        const created = await repo.create(data);
        res.status(201).json(created);
    } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU already exists' });
        res.status(400).json({ error: e.message });
    }
});

router.patch('/products/:id', jwtAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
        const patch = PatchSchema.parse(req.body);
        const updated = await repo.patch(id, patch);
        res.json(updated);
    } catch (e: any) {
        if (String(e.message).includes('Product not found')) return res.status(404).json({ error: 'Not found' });
        res.status(400).json({ error: e.message });
    }
});

router.get('/products/:id', jwtAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
    const p = await repo.findById(id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
});

router.get('/products', jwtAuth, async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const lim = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(lim) && lim > 0 ? Math.floor(lim) : 20;
    const curRaw = req.query.cursor;
    const cursor =
        curRaw !== undefined && curRaw !== null && String(curRaw).trim() !== ''
            ? Number(curRaw)
            : undefined;

    const out = await repo.findMany({ search, limit, cursor });
    res.json(out);
});

export default router;
