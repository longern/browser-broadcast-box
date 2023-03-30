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

const app = new Hono();

app.use("/api/*", cors());

app.use("/api/whip", (c, next) => {
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
  const db = c.env!.DB as any;
  const stmt = live
    ? "SELECT id, title, live, thumbnail FROM channels WHERE live = 1"
    : "SELECT id, title, live, thumbnail FROM channels";
  const { results } = await db.prepare(stmt).all();
  return c.json({ channels: results });
});

app.post("/api/channels", async (c) => {
  const { id, title, thumbnail } = await c.req.json();
  const db = c.env!.DB as any;
  const count = await db
    .prepare("INSERT INTO channels VALUES (?, ?, ?, ?)")
    .first(id, title, 0, thumbnail);
  if (count === 0) {
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
  const db = c.env!.DB as any;
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
  const db = c.env!.DB as any;
  const channel = await db
    .prepare("SELECT id, title, live, thumbnail FROM channels WHERE id = ?")
    .bind(id)
    .first();
  if (!channel) {
    c.status(404);
    return c.json({ error: "Channel not found" });
  }
  return c.json(channel);
});

app.patch("/api/channels/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env!.DB as any;
  const body: Record<string, string | number | null> = await c.req.json();
  const segment = Object.keys(body)
    .map((key) => {
      if (!["title", "live", "thumbnail"].includes(key)) {
        throw new HTTPException(400, { message: "Invalid key" });
      }
      return `${key} = ?`;
    })
    .join(", ");
  const count = await db
    .prepare(`UPDATE channels SET ${segment} WHERE id = ?`)
    .bind(Object.values(body), id)
    .first();
  if (!count) {
    c.status(404);
    return c.json({ error: "Channel not found" });
  }
  return c.json(body);
});

app.onError((err) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  throw err;
});

export default app;
