import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'b2b',
    password: process.env.DB_PASSWORD || 'b2b',
    database: process.env.DB_NAME || 'b2b',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
});

export async function testConnection() {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('✅ MySQL connected:', (rows as any)[0].result === 2 ? 'OK' : 'Unexpected result');
    } catch (err) {
        console.error('❌ MySQL connection failed:', err);
    }
}
