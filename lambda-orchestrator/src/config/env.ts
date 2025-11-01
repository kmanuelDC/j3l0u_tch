import 'dotenv/config';
export const ENV = {
    PORT: process.env.PORT ? Number(process.env.PORT) : 3003,
    CUSTOMERS_BASE: process.env.CUSTOMERS_BASE ?? 'http://localhost:3001',
    ORDERS_BASE: process.env.ORDERS_BASE ?? 'http://localhost:3002',
    JWT_SECRET: process.env.JWT_SECRET ?? 'supersecret',
    SERVICE_TOKEN: process.env.SERVICE_TOKEN ?? 'SERVICE_TOKEN',
};
