// handler.ts — Cumple con la PT: valida cliente via /internal con SERVICE_TOKEN,
// crea y confirma orden en Orders usando un JWT de servicio corto.

import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ENV as env } from './config/env.js';



type Item = { product_id: number; qty: number };
type Body = {
    customer_id: number;
    items: Item[];
    idempotency_key: string;
    correlation_id?: string;
};

type ApiGwEvent = {
    body?: string | Body;
    headers?: Record<string, string | undefined>;
};


const fetchJson = async (url: string, init: RequestInit & { timeoutMs?: number } = {}) => {
    console.log('fetchJson', url, init);
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        init.timeoutMs ?? Number(process.env.REQUEST_TIMEOUT_MS ?? 5000),
    );
    try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        const text = await res.text();
        let json: any;
        try { json = text ? JSON.parse(text) : undefined; } catch { json = { raw: text }; }
        return { ok: res.ok, status: res.status, json };
    } finally {
        clearTimeout(timeout);
    }
};

const jsonResponse = (
    statusCode: number,
    body: unknown,
    extraHeaders?: Record<string, string>
) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key, X-Correlation-Id',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        ...(extraHeaders || {}),
    },
    body: JSON.stringify(body),
    isBase64Encoded: false,
});


const isPositiveInt = (n: unknown) => Number.isInteger(n) && (n as number) > 0;

const validateBody = (b: any): { ok: true; data: Body } | { ok: false; error: string } => {
    if (!b || typeof b !== 'object') return { ok: false, error: 'Body must be a JSON object' };
    if (!isPositiveInt(b.customer_id)) return { ok: false, error: 'customer_id must be a positive integer' };
    if (!Array.isArray(b.items) || b.items.length === 0) return { ok: false, error: 'items must be a non-empty array' };
    for (const it of b.items) {
        if (!isPositiveInt(it?.product_id) || !isPositiveInt(it?.qty)) {
            return { ok: false, error: 'each item must have positive integer product_id and qty' };
        }
    }
    if (typeof b.idempotency_key !== 'string' || !b.idempotency_key.trim()) {
        return { ok: false, error: 'idempotency_key is required' };
    }
    return {
        ok: true,
        data: {
            customer_id: Number(b.customer_id),
            items: b.items.map((i: any) => ({ product_id: Number(i.product_id), qty: Number(i.qty) })),
            idempotency_key: String(b.idempotency_key),
            correlation_id: b.correlation_id ? String(b.correlation_id) : undefined,
        },
    };
};

export async function handler(event: ApiGwEvent) {
    let bodyRaw: any;
    try {
        bodyRaw = typeof event?.body === 'string' ? JSON.parse(event!.body as string) : event?.body;
    } catch {
        return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const validated = validateBody(bodyRaw);
    if (!validated.ok) return jsonResponse(400, { error: validated.error });
    const body = validated.data;

    const correlationId = body.correlation_id || randomUUID();
    const baseHeaders = {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
    };

    const CUSTOMERS_BASE = env.CUSTOMERS_BASE;
    const ORDERS_BASE = env.ORDERS_BASE;
    const SERVICE_TOKEN = env.SERVICE_TOKEN;
    const JWT_SECRET = env.JWT_SECRET;
    if (!CUSTOMERS_BASE || !ORDERS_BASE || !SERVICE_TOKEN || !JWT_SECRET) {
        return jsonResponse(500, {
            error: 'Missing required env variables',
            missing: {
                CUSTOMERS_API_BASE: !CUSTOMERS_BASE,
                ORDERS_API_BASE: !ORDERS_BASE,
                SERVICE_TOKEN: !SERVICE_TOKEN,
                JWT_SECRET: !JWT_SECRET,
            },
            correlation_id: correlationId,
        });
    }

    {
        const url = `${CUSTOMERS_BASE}/internal/customers/${body.customer_id}`;
        const r = await fetchJson(url, {
            method: 'GET',
            headers: { ...baseHeaders, Authorization: `Bearer ${SERVICE_TOKEN}` },
        });

        if (!r.ok) {
            return jsonResponse(400, {
                error: 'Invalid customer (internal check failed)',
                correlation_id: correlationId,
                upstream_status: r.status,
                details: r.json,
            });
        }
    }

    const ordersToken = jwt.sign(
        { sub: 'lambda-orchestrator', role: 'service', aud: 'orders-api' },
        JWT_SECRET,
        { expiresIn: '5m' },
    );

    const createOrder = await fetchJson(`${ORDERS_BASE}/orders`, {
        method: 'POST',
        headers: {
            ...baseHeaders,
            Authorization: `Bearer ${ordersToken}`,
            'X-Idempotency-Key': body.idempotency_key, 
        },
        body: JSON.stringify({ customer_id: body.customer_id, items: body.items }),
    });


    if (!createOrder.ok) {
        return jsonResponse(502, {
            error: 'Failed to create order',
            correlation_id: correlationId,
            upstream_status: createOrder.status,
            details: createOrder.json,
        });
    }

    const orderCreated = createOrder.json;

    const confirm = await fetchJson(`${ORDERS_BASE}/orders/${orderCreated.id}/confirm`, {
        method: 'POST',
        headers: {
            ...baseHeaders,
            Authorization: `Bearer ${ordersToken}`,
            'X-Idempotency-Key': body.idempotency_key,
        },
    });

    if (!confirm.ok) {
        return jsonResponse(502, {
            error: 'Failed to confirm order',
            correlation_id: correlationId,
            upstream_status: confirm.status,
            details: confirm.json,
        });
    }

    const confirmed = confirm.json;
    const customerResp = await fetchJson(`${CUSTOMERS_BASE}/internal/customers/${body.customer_id}`, {
        method: 'GET',
        headers: { ...baseHeaders, Authorization: `Bearer ${SERVICE_TOKEN}` },
    });
    console.log('customerResp', customerResp);

    return jsonResponse(201, {
        success: true,
        correlationId: correlationId,
        data: {
            customer: customerResp.ok ? customerResp.json : undefined,
            order: confirmed,
        },
    });
}
