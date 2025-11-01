import express from 'express';
import router from './interfaces/http/routers/customersRouter.js';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());
app.use(router);
export default app;