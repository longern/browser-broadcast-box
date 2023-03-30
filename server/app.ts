import { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

type Channel = {
  id: string;
  live: boolean;
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

app.get("/api/channels", async (c) => {
  const live = c.req.query("live");
  const db = c.env.DB;
  const stmt = live
    ? "SELECT id, title, live, thumbnail FROM channels WHERE live = 1"
    : "SELECT id, title, live, thumbnail FROM channels";
  const { results } = await db.prepare(stmt).all();
  return c.json({ channels: results! });
});

app.post("/api/channels", async (c) => {
  const { id, title, thumbnail } = await c.req.json();
  const db = c.env.DB;
  const row = await db
    .prepare("INSERT INTO channels VALUES (?, ?, ?, ?)")
    .bind(id, title, 0, thumbnail)
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
    .prepare("INSERT OR REPLACE INTO channels VALUES (?, ?, ?, ?)")
    .bind(
      reqChannel.id,
      reqChannel.title,
      reqChannel.live ? 1 : 0,
      reqChannel.thumbnail
    )
    .run();
  return c.json(reqChannel);
});

app.get("/api/channels/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const channel = await db
    .prepare("SELECT id, title, live, thumbnail FROM channels WHERE id = ?")
    .bind(id)
    .first();
  if (!channel) throw new HTTPException(404, { message: "Channel not found" });
  return c.json(channel);
});

app.post("/api/live_inputs", async (c) => {
  const live_inputs_url = c.env.LIVE_INPUTS_URL;
  if (live_inputs_url) {
    const response = await fetch(live_inputs_url, {
      method: "POST",
      headers: { Authorization: c.req.header("Authorization")! },
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } else {
    const url = new URL(c.req.url);
    const origin = c.req.headers.get("origin") || url.origin;
    return c.json({
      success: true,
      result: {
        webRTC: {
          url: `${origin}/api/whip`,
        },
        webRTCPlayback: {
          url: `${origin}/api/whep`,
        },
      },
    });
  }
});

app.patch("/api/channels/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const body: Record<string, string | number | null> = await c.req.json();
  const segment = Object.keys(body)
    .map((key) => {
      if (!["title", "live", "thumbnail"].includes(key))
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
