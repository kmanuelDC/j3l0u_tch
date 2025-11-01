import { Pool } from 'mysql2/promise';
import { Product } from '../../domain/entities/Product.js';
import { ProductRepository } from '../../domain/repositories/ProductRepository.js';
import { pool } from "../db/mysql.js";

export class ProductMySQLRepository implements ProductRepository {
    constructor() { }

    async findById(id: number): Promise<Product | null> {
        const [rows] = await pool.query(
            'SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id = ? LIMIT 1',
            [id]
        );
        const r = (rows as any[])[0];
        if (!r) return null;
        return {
            id: r.id,
            sku: r.sku,
            name: r.name,
            price_cents: r.price_cents,
            stock: r.stock,
            created_at: r.created_at,
        };
    }

    async create(input: Omit<Product, 'id'>): Promise<Product> {
        const [res] = await pool.query(
            'INSERT INTO products (sku, name, price_cents, stock, created_at) VALUES (?,?,?,?,NOW())',
            [input.sku, input.name, input.price_cents, input.stock]
        );
        const insertId = (res as any).insertId as number;
        const p = await this.findById(insertId);
        if (!p) throw new Error('Failed to fetch inserted product');
        return p;
    }

    async patch(id: number, data: Partial<Omit<Product, 'id'>>): Promise<Product> {
        const fields: string[] = [];
        const values: any[] = [];
        if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku); }
        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.price_cents !== undefined) { fields.push('price_cents = ?'); values.push(data.price_cents); }
        if (data.stock !== undefined) { fields.push('stock = ?'); values.push(data.stock); }
        if (fields.length === 0) return (await this.findById(id))!;
        values.push(id);
        await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
        const p = await this.findById(id);
        if (!p) throw new Error('Product not found after patch');
        return p;
    }

    async findMany(params: { search?: string; limit: number; cursor?: number }) {
        const where: string[] = [];
        const values: any[] = [];
        if (params.search) {
            where.push('(name LIKE ? OR sku LIKE ?)');
            values.push(`%${params.search}%`, `%${params.search}%`);
        }
        if (params.cursor) {
            where.push('id > ?');
            values.push(params.cursor);
        }
        const sql = `
      SELECT id, sku, name, price_cents, stock, created_at
      FROM products
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY id ASC
      LIMIT ?`;
        values.push(params.limit);

        const [rows] = await pool.query(sql, values);
        const items = (rows as any[]).map(r => ({
            id: r.id,
            sku: r.sku,
            name: r.name,
            price_cents: r.price_cents,
            stock: r.stock,
            created_at: r.created_at,
        })) as Product[];

        const nextCursor = items.length === params.limit ? items[items.length - 1].id : undefined;
        return { items, nextCursor };
    }
}
