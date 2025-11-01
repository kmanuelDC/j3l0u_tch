import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { MySQLCustomerRepository } from '../../../infrastructure/repositories/MySQLCustomerRepository.js';
import { CreateCustomerUseCase } from '../../../application/usecases/CreateCustomerUseCase.js';
import { jwtAuth, serviceAuth } from '../middlewares/auth.middleware.js';

const repo = new MySQLCustomerRepository();
const router = Router();

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
        const uc = new CreateCustomerUseCase(repo);
        const customer = await uc.execute(req.body);
        res.status(201).json(customer);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/customers/:id', jwtAuth, async (req, res) => {
    const c = await repo.findById(Number(req.params.id));
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
});

router.get('/customers', jwtAuth, async (req, res) => {
    const { search = '', limit = '20', cursor } = req.query as any;

    const limNum = Number(limit);
    const safeLimit = Number.isFinite(limNum) && limNum > 0 ? Math.floor(limNum) : 20;

    const curNum =
        cursor !== undefined && cursor !== null && String(cursor).trim() !== ''
            ? Number(cursor)
            : undefined;

    try {
        const out = await repo.search(String(search ?? '').trim(), safeLimit, curNum);
        res.json(out);
    } catch (e: any) {
        console.error('GET /customers error:', e);
        res.status(400).json({ error: e.message });
    }
});

router.get('/internal/customers/:id', serviceAuth, async (req, res) => {
    const c = await repo.findById(Number(req.params.id));
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
});

export default router;
