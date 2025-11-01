// app.ts
import express from 'express';
import routerOrders from './interfaces/http/routers/orders.router.js';
import routerProducts from './interfaces/http/routers/products.router.js';

const app = express();
app.use(express.json());
app.use(routerOrders);
app.use(routerProducts);

export default app;
