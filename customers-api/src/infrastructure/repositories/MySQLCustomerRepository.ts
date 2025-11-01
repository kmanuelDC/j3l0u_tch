import { Customer } from "../../domain/entities/Customer.js";
import { CustomerRepository } from "../../domain/repositories/CustomerRepository.js";
import { pool } from "../db/mysql.js";



export class MySQLCustomerRepository implements CustomerRepository {
    async create(data: Omit<Customer, 'id'>): Promise<Customer> {
        const [res] = await pool.execute(
            'INSERT INTO customers(name,email,phone) VALUES(?,?,?)',
            [data.name, data.email, data.phone ?? null]
        );
        const id = (res as any).insertId as number;
        return { id, ...data };
    }

    async findById(id: number): Promise<Customer | null> {
        const [rows] = await pool.execute('SELECT id,name,email,phone FROM customers WHERE id=? AND deleted_at IS NULL', [id]);
        const r = (rows as any[])[0];
        return r ? { id: r.id, name: r.name, email: r.email, phone: r.phone } : null;
    }

    async search(query: string, limit: number, cursor?: number) {
        const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
            ? Math.floor(Number(limit))
            : 20;

        const params: any[] = [];
        let sql = 'SELECT id,name,email,phone FROM customers WHERE deleted_at IS NULL';

        const q = (query ?? '').trim();
        if (q) {
            sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        if (cursor !== undefined && cursor !== null) {
            const cur = Number(cursor);
            if (Number.isFinite(cur) && cur > 0) {
                sql += ' AND id > ?';
                params.push(cur);
            }
        }

        // 👇 Importante: incrustar LIMIT ya validado (entero) para evitar el error
        sql += ` ORDER BY id ASC LIMIT ${safeLimit}`;

        // Debug opcional:
        // console.log('SQL:', sql, 'PARAMS:', params);

        const [rows] = await pool.execute(sql, params);
        const items = (rows as any[]).map(r => ({
            id: r.id, name: r.name, email: r.email, phone: r.phone
        }));

        const nextCursor = items.length === safeLimit ? items[items.length - 1].id : undefined;
        return { items, nextCursor };
    }


    async update(id: number, data: Partial<Pick<Customer, 'name' | 'email' | 'phone'>>): Promise<Customer> {
        const fields: string[] = [];
        const params: any[] = [];

        for (const [k, v] of Object.entries(data)) {
            if (v !== undefined) {
                fields.push(`${k} = ?`);
                params.push(v);
            }
        }

        if (fields.length === 0) {
            throw new Error('Nothing to update');
        }

        params.push(id);
        await pool.execute(
            `UPDATE customers SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
            params
        );

        const updated = await this.findById(id);
        if (!updated) throw new Error('Customer not found');
        return updated;
    }

    async softDelete(id: number): Promise<void> {
        await pool.execute(
            'UPDATE customers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
            [id]
        );
    }
}