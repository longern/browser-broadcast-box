import { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import liveInputApp from "./live-inputs.ts";

type Channel = {
  id: string;
  live_input: string;
  title: string;
  thumbnail: string;
};

type Bindings = {
  BEARER_TOKEN?: string;
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

app.use("/api/*", (c, next) => {
  if (
    !c.env.BEARER_TOKEN ||
    !["POST", "PATCH", "DELETE"].includes(c.req.method) ||
    c.req.path === "/api/whep"
  )
    return next();
  return bearerAuth({ token: c.env.BEARER_TOKEN as string })(c, next);
});

app.get("/api/channels", async (c) => {
  const live = c.req.query("live");
  const db = c.env.DB;
  const baseStmt = "SELECT id, live_input, title, thumbnail FROM channels";
  const stmt = live ? `${baseStmt} WHERE live_input IS NOT NULL` : baseStmt;
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

app.post("/api/channels/:id/live_input", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const channel = (await db
    .prepare("SELECT id, live_input FROM channels WHERE id = ?")
    .bind(id)
    .first()) as { id: string; live_input: string | null } | null;
  if (!channel) throw new HTTPException(404, { message: "Channel not found" });
  if (channel.live_input)
    throw new HTTPException(409, { message: "Live input already exists" });
  const response = await app.fetch(new Request("/api/live_inputs"), {
    method: "POST",
    headers: { Authorization: c.env.BEARER_TOKEN },
  });
  if (!response.ok)
    throw new HTTPException(500, { message: await response.text() });
  const body = await response.json();
  channel.live_input = body.result.uid;
  await db
    .prepare("UPDATE channels SET live_input = ? WHERE id = ?")
    .bind(channel.live_input, id)
    .run();
  return c.json({ success: true, result: channel });
});

app.delete("/api/channels/:id/live_input", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const channel = (await db
    .prepare("SELECT id, live_input FROM channels WHERE id = ?")
    .bind(id)
    .first()) as { id: string; live_input: string | null } | null;
  if (!channel) throw new HTTPException(404, { message: "Channel not found" });
  if (!channel.live_input)
    throw new HTTPException(404, { message: "Live input not found" });
  const response = await app.fetch(
    new Request(`/api/live_inputs/${channel.live_input}`),
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: c.env.BEARER_TOKEN,
      },
    }
  );
  if (!response.ok)
    throw new HTTPException(500, { message: await response.text() });
  channel.live_input = null;
  await db
    .prepare("UPDATE channels SET live_input = NULL WHERE id = ?")
    .bind(id)
    .run();
  return c.json({ success: true, result: channel });
});

app.route("/api/live_inputs", liveInputApp);

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
