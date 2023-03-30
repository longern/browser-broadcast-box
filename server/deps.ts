export {
  serve,
  type ConnInfo,
} from "https://deno.land/std@0.178.0/http/server.ts";

export { loadSync } from "https://deno.land/std@0.181.0/dotenv/mod.ts";

import "hono";
import "hono/bearer-auth";
import "hono/cors";
import "hono/http-exception";

export { serveStatic } from "https://deno.land/x/hono@v3.1.4/adapter/deno/index.ts";
