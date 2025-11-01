import { IdempotencyRepository, IdempotencyRow } from "../../domain/repositories/IdempotencyRepository.js";
import { pool } from "../db/mysql.js";


export class MySQLIdempotencyRepository implements IdempotencyRepository {
    async find(key: string): Promise<IdempotencyRow | null> {
        const [rows] = await pool.execute(
            'SELECT `key`, target_type, target_id, status, CAST(response_body AS CHAR) AS response_body FROM idempotency_keys WHERE `key`=?',
            [key]
        );
        const r = (rows as any[])[0];
        return r ? { key: r.key, target_type: r.target_type, target_id: r.target_id, status: r.status, response_body: r.response_body } : null;
    }

    async save(row: Omit<IdempotencyRow, 'response_body'> & { response_body?: string | null }): Promise<void> {
        await pool.execute(
            'INSERT INTO idempotency_keys(`key`, target_type, target_id, status, response_body, created_at, expires_at) VALUES (?,?,?,?,?, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY))',
            [row.key, row.target_type, row.target_id, row.status, row.response_body ?? null]
        );
    }

    async update(key: string, data: Partial<IdempotencyRow>): Promise<void> {
        if (!Object.keys(data).length) return;
        const fields: string[] = []; const params: any[] = [];
        for (const [k, v] of Object.entries(data)) { fields.push(`${k}=?`); params.push(v); }
        params.push(key);
        await pool.execute(`UPDATE idempotency_keys SET ${fields.join(', ')} WHERE ` + '`key`=?', params);
    }
}
