import { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

type Channel = {
  id: string;
  live_input: string;
  title: string;
  thumbnail: string;
};

type Bindings = {
  BEARER_TOKEN?: string;
  DB: D1Database;
  LIVE_INPUTS_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

app.use("/api/*", (c, next) => {
  if (
    !c.env?.BEARER_TOKEN ||
    !["POST", "PATCH", "DELETE"].includes(c.req.method) ||
    c.req.path === "/api/whep"
  )
    return next();
  return bearerAuth({ token: c.env.BEARER_TOKEN as string })(c, next);
});

app.use("/api/live_inputs/:id?", async (c, next) => {
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

app.get("/api/channels", async (c) => {
  const live = c.req.query("live");
  const db = c.env.DB;
  const base_stmt = "SELECT id, live_input, title, thumbnail FROM channels";
  const stmt = live ? `${base_stmt} WHERE live_input IS NOT NULL` : base_stmt;
  const { results } = await db.prepare(stmt).all();
  return c.json({ channels: results! });
});

app.post("/api/channels", async (c) => {
  const { id, title, thumbnail } = await c.req.json();
  const db = c.env.DB;
  const row = await db
    .prepare("INSERT INTO channels VALUES (?, ?, ?, ?)")
    .bind(id, null, title, thumbnail)
    .first();
  if (row) {
    c.status(409);
    return c.json({ error: "Channel already exists" });
  }
  const channel = {
    id: id,
    live: false,
    title,
    thumbnail,
  };
  return c.json(channel);
});

app.put("/api/channels", async (c) => {
  const reqChannel: Channel = await c.req.json();
  const db = c.env.DB;

  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, live_input TEXT, title TEXT, thumbnail TEXT)"
    )
    .run();

  await db
    .prepare("INSERT OR REPLACE INTO channels VALUES (?, ?, ?, ?)")
    .bind(
      reqChannel.id,
      reqChannel.live_input,
      reqChannel.title,
      reqChannel.thumbnail
    )
    .run();
  return c.json(reqChannel);
});

app.get("/api/channels/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const channel = await db
    .prepare(
      "SELECT id, live_input, title, thumbnail FROM channels WHERE id = ?"
    )
    .bind(id)
    .first();
  if (!channel) throw new HTTPException(404, { message: "Channel not found" });
  return c.json(channel);
});

app.get("/api/live_inputs", async (c) => {
  const db = c.env.DB;
  const { results } = await db
    .prepare("SELECT uid, created, meta FROM live_inputs")
    .all();
  return c.json({ success: true, result: results });
});

app.post("/api/live_inputs", async (c) => {
  const db = c.env.DB;
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS live_inputs (uid TEXT PRIMARY KEY, created TEXT, meta TEXT)"
    )
    .run();
  const uid = crypto.randomUUID();
  const created = new Date().toISOString();
  await db
    .prepare("INSERT INTO live_inputs (uid, created, meta) VALUES (?, ?, ?)")
    .bind(uid, created, null)
    .run();
  const url = new URL(c.req.url);
  const origin = c.req.headers.get("origin") || url.origin;
  return c.json({
    success: true,
    result: {
      uid,
      created,
      webRTC: {
        url: `${origin}/api/whip`,
      },
      webRTCPlayback: {
        url: `${origin}/api/whep`,
      },
    },
  });
});

app.get("/api/live_inputs/:uid", async (c) => {
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

app.delete("/api/live_inputs/:uid", async (c) => {
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

app.patch("/api/channels/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const body: Record<string, string | number | null> = await c.req.json();
  const segment = Object.keys(body)
    .map((key) => {
      if (!["live_input", "title", "thumbnail"].includes(key))
        throw new HTTPException(400, { message: "Invalid key" });
      return `${key} = ?`;
    })
    .join(", ");
  const count = await db
    .prepare(`UPDATE channels SET ${segment} WHERE id = ?`)
    .bind(...Object.values(body), id)
    .first();
  if (!count) {
    throw new HTTPException(404, { message: "Channel not found" });
  }
  return c.json(body);
});

app.notFound(() => {
  throw new HTTPException(404, { message: "API endpoint not found" });
});

app.onError((err) => {
  if (err instanceof HTTPException) {
    return new Response(
      JSON.stringify({
        success: false,
        result: null,
        messages: [{ code: err.status, message: err.message }],
      }),
      {
        status: err.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  throw err;
});

export default app;
