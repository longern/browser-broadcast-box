import { Hono } from "./deps.ts";

type Channel = {
  id: string;
  live: boolean;
  title: string;
  thumbnail: string;
};

const app = new Hono();
const channels: Channel[] = [];

app.get("/api/channels", (c) => {
  const live = c.req.query("live");
  if (live) {
    return c.json({
      channels: channels.filter((c) => c.live),
    });
  }
  return c.json({ channels });
});

app.post("/api/channels", async (c) => {
  const { id, title, thumbnail } = await c.req.json();
  if (channels.find((c) => c.id === id)) {
    c.status(409);
    return c.json({ error: "Channel already exists" });
  }
  const channel = {
    id: id,
    live: false,
    title,
    thumbnail,
  };
  channels.push(channel);
  return c.json(channel);
});

app.get("/api/channels/:id", (c) => {
  const id = c.req.param("id");

  const channel = channels.find((c) => c.id === id);
  if (!channel) {
    c.status(404);
    return c.json({ error: "Channel not found" });
  }
  return c.json(channel);
});

app.patch("/api/channels/:id", async (c) => {
  const id = c.req.param("id");
  const channel = channels.find((c) => c.id === id);
  if (!channel) {
    c.status(404);
    return c.json({ error: "Channel not found" });
  }
  Object.assign(channel, await c.req.json());
  return c.json(channel);
});

export default app;
