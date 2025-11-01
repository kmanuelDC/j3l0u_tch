import app from "./app.js";
import { ENV as env } from "./config/env.js";

app.listen(env.port, () => console.log(`Customers API on :${env.port}`));