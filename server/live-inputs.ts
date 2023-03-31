import { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { HTTPException } from "hono/http-exception";

type Bindings = {
  BEARER_TOKEN?: string;
  DB: D1Database;
  LIVE_INPUTS_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", (c, next) => {
  if (!c.env.BEARER_TOKEN) return next();
  return bearerAuth({ token: c.env.BEARER_TOKEN })(c, next);
});

app.use("/:id?", async (c, next) => {
  const live_inputs_url = c.env.LIVE_INPUTS_URL;
  if (!live_inputs_url) return next();
  const id = c.req.param("id");
  const url = id ? `${live_inputs_url}/${id}` : live_inputs_url;
  const headers = new Headers();
  headers.set("Authorization", c.req.header("Authorization")!);
  const response = await fetch(url, {
    method: c.req.method,
    headers,
    body: c.req.body,
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});

app.get("/" as string, async (c) => {
  const db = c.env.DB;
  const { results } = await db
    .prepare("SELECT uid, created, meta FROM live_inputs")
    .all();
  return c.json({ success: true, result: results });
});

app.post("/" as string, async (c) => {
  const db = c.env.DB;
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS live_inputs (uid TEXT PRIMARY KEY, created TEXT, meta TEXT)"
    )
    .run();
  const uid = crypto.randomUUID();
  const created = new Date().toISOString();
  const meta = await c.req
    .json()
    .then((body) => body.meta as Record<string, unknown>)
    .catch(() => null);
  await db
    .prepare("INSERT INTO live_inputs (uid, created, meta) VALUES (?, ?, ?)")
    .bind(uid, created, meta ? JSON.stringify(meta) : null)
    .run();
  const url = new URL(c.req.url);
  const origin = c.req.headers.get("origin") || url.origin;
  return c.json({
    success: true,
    result: {
      uid,
      created,
      meta,
      webRTC: {
        url: `${origin}/api/whip`,
      },
      webRTCPlayback: {
        url: `${origin}/api/whep`,
      },
    },
  });
});

app.get("/:uid", async (c) => {
  const uid = c.req.param("uid");
  const db = c.env.DB;
  const live_input = await db
    .prepare("SELECT uid, created, meta FROM live_inputs WHERE uid = ?")
    .bind(uid)
    .first();
  if (!live_input)
    throw new HTTPException(404, { message: `Live input ${uid} not found` });
  return c.json({ success: true, result: live_input });
});

app.delete("/:uid", async (c) => {
  const uid = c.req.param("uid");
  const db = c.env.DB;
  const count = await db
    .prepare("DELETE FROM live_inputs WHERE uid = ?")
    .bind(uid)
    .first();
  if (!count)
    throw new HTTPException(404, { message: `Live input ${uid} not found` });
  return new Response(null, { status: 204 });
});

export default app;
