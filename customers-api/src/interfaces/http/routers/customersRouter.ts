// src/interfaces/http/routers/customers.router.ts
import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { MySQLCustomerRepository } from '../../../infrastructure/repositories/MySQLCustomerRepository.js';
import { jwtAuth, serviceAuth } from '../middlewares/auth.middleware.js';

const router = Router();
const repo = new MySQLCustomerRepository();

const CreateCustomerSchema = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim().min(1).optional(),
});

const UpdateCustomerSchema = z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(1).optional(),
});

router.get('/health', (_req, res) => res.json({ ok: true }));

router.get('/token', (_req, res) => {
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_for_jwt';

        const payload = {
            sub: 1,
            role: 'admin',
            name: 'Demo User',
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            ok: true,
            token,
            example: `Authorization: Bearer ${token}`,
            expiresIn: '1h',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/customers', jwtAuth, async (req, res) => {
    try {
        const data = CreateCustomerSchema.parse(req.body);
        const created = await repo.create(data);
        res.status(201).json(created);
    } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(400).json({ error: e.message ?? 'Invalid payload' });
    }
});


router.get('/customers/:id', jwtAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

    const c = await repo.findById(id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
});


router.get('/customers', jwtAuth, async (req, res) => {
    try {
        const search = typeof req.query.search === 'string' ? req.query.search : '';
        const lim = Number(req.query.limit ?? 20);
        const limit = Number.isFinite(lim) && lim > 0 ? Math.floor(lim) : 20;

        const cursorRaw = req.query.cursor;
        const cursor =
            cursorRaw !== undefined && cursorRaw !== null && String(cursorRaw).trim() !== ''
                ? Number(cursorRaw)
                : undefined;

        const out = await repo.search(search, limit, cursor);
        res.json(out);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});


router.put('/customers/:id', jwtAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

        const patch = UpdateCustomerSchema.parse(req.body);
        if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update' });

        const updated = await repo.update(id, patch);
        res.json(updated);
    } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        if (String(e.message).includes('Customer not found')) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.status(400).json({ error: e.message ?? 'Invalid payload' });
    }
});


router.delete('/customers/:id', jwtAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

    await repo.softDelete(id);
    res.status(204).send();
});


router.get('/internal/customers/:id', serviceAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

    const c = await repo.findById(id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
});

export default router;
