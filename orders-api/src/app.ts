// app.ts
import express from 'express';
import router from './interfaces/http/routers/orders.router.js';

const app = express();
app.use(express.json());
app.use(router);

export default app;
