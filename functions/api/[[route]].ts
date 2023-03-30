import { handle } from "hono/cloudflare-pages";

import app from "../../server/app.ts";

export const onRequest = handle(app);
