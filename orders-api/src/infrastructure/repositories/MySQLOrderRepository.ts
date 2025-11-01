import { OrderItemRow, OrderRepository, OrderRow } from "../../domain/repositories/OrderRepository.js";
import { pool } from "../db/mysql.js";


export class MySQLOrderRepository implements OrderRepository {

    // src/infrastructure/repositories/MySQLOrderRepository.ts
    async list({
        status,
        from,
        to,
        limit,
        cursor,
    }: {
        status?: 'CREATED' | 'CONFIRMED' | 'CANCELED';
        from?: string;
        to?: string;
        limit: number;
        cursor?: number;
    }): Promise<{ items: OrderRow[]; nextCursor?: number }> {
        const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
            ? Math.floor(Number(limit))
            : 20;

        const params: any[] = [];
        let sql = 'SELECT id, customer_id, status, total_cents FROM orders WHERE 1=1';

        if (status) { sql += ' AND status = ?'; params.push(status); }
        if (from) { sql += ' AND created_at >= ?'; params.push(from); }
        if (to) { sql += ' AND created_at < ?'; params.push(to); }
        if (cursor !== undefined && cursor !== null) {
            const cur = Number(cursor);
            if (Number.isFinite(cur) && cur > 0) {
                sql += ' AND id > ?';
                params.push(cur);
            }
        }

        sql += ` ORDER BY id ASC LIMIT ${safeLimit}`;

        const [rows] = await pool.execute(sql, params);

        const items: OrderRow[] = [];
        for (const o of rows as any[]) {
            const [iRows] = await pool.execute(
                'SELECT product_id, qty, unit_price_cents, subtotal_cents FROM order_items WHERE order_id = ?',
                [o.id]
            );
            items.push({
                id: o.id,
                customer_id: o.customer_id,
                status: o.status,
                total_cents: o.total_cents,
                items: iRows as any[],
            });
        }

        const nextCursor = items.length === safeLimit ? items[items.length - 1].id : undefined;
        return { items, nextCursor };
    }



    async getById(id: number): Promise<OrderRow | null> {
        const [oRows] = await pool.execute('SELECT id, customer_id, status, total_cents FROM orders WHERE id=?', [id]);
        const o = (oRows as any[])[0];
        if (!o) return null;
        const [iRows] = await pool.execute(
            'SELECT product_id, qty, unit_price_cents, subtotal_cents FROM order_items WHERE order_id=?',
            [id]
        );
        return { id: o.id, customer_id: o.customer_id, status: o.status, total_cents: o.total_cents, items: iRows as any[] };
    }

    async createWithItemsAndDecrementStock(input: { customer_id: number; total_cents: number; items: OrderItemRow[] }): Promise<OrderRow> {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [res] = await conn.execute(
                'INSERT INTO orders(customer_id, status, total_cents) VALUES (?,?,?)',
                [input.customer_id, 'CREATED', input.total_cents]
            );
            const orderId = (res as any).insertId as number;

            for (const it of input.items) {
                await conn.execute(
                    'INSERT INTO order_items(order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?,?,?,?,?)',
                    [orderId, it.product_id, it.qty, it.unit_price_cents, it.subtotal_cents]
                );
                const [upd]: any = await conn.execute(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                    [it.qty, it.product_id, it.qty]
                );
                if (upd.affectedRows === 0) {
                    throw new Error(`Insufficient stock for product ${it.product_id}`);
                }
            }

            await conn.commit();
            return { id: orderId, customer_id: input.customer_id, status: 'CREATED', total_cents: input.total_cents, items: input.items };
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

    async confirm(orderId: number): Promise<OrderRow> {
        const cur = await this.getById(orderId);
        if (!cur) throw new Error('Order not found');
        await pool.execute('UPDATE orders SET status=? WHERE id=?', ['CONFIRMED', orderId]);
        const after = await this.getById(orderId);
        return after!;
    }

    async cancel(orderId: number): Promise<OrderRow> {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [oRows] = await conn.execute('SELECT id, status FROM orders WHERE id=? FOR UPDATE', [orderId]);
            const o = (oRows as any[])[0];
            if (!o) throw new Error('Order not found');

            if (o.status === 'CREATED') {
                const [items] = await conn.execute('SELECT product_id, qty FROM order_items WHERE order_id=?', [orderId]);
                for (const it of items as any[]) {
                    await conn.execute('UPDATE products SET stock = stock + ? WHERE id=?', [it.qty, it.product_id]);
                }
            }

            await conn.execute('UPDATE orders SET status=? WHERE id=?', ['CANCELED', orderId]);
            await conn.commit();
            const after = await this.getById(orderId);
            return after!;
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }
}
