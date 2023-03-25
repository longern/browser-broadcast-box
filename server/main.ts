import { ConnInfo, serve, serveStatic } from "./deps.ts";

import app from "./app.ts";
import { websocketHandler, websocketProxyHandler } from "./ws.ts";

app.get("/", async (c, next) => {
  if (c.req.header("upgrade")?.toLowerCase() === "websocket")
    c.res = websocketHandler(c.req.raw);
  else await next();
});

app.get("/api/:endpoint{whip|whep}", async (c, next) => {
  if (c.req.header("accept")?.startsWith("text/html"))
    return serveStatic({ path: "./server/proxy.html" })(c, next);
  await next();
});

app.post("/api/:endpoint{whip|whep}", (c) => {
  return websocketProxyHandler(c.req.raw);
});

app.get("/backend", (c) => c.redirect("/backend/", 301));
app.get("/backend/*", serveStatic({ root: "./server" }));

app.get("/*", serveStatic({ root: "./build" }));

async function handler(req: Request, connInfo: ConnInfo): Promise<Response> {
  const remoteAddr = connInfo.remoteAddr as Deno.NetAddr;
  const headers = new Headers(req.headers);
  headers.set("CF-Connecting-IP", remoteAddr.hostname);
  const newReq = new Request(req.url, {
    method: req.method,
    headers: headers,
    body: req.body,
    referrer: req.referrer,
    referrerPolicy: req.referrerPolicy,
    mode: req.mode,
    credentials: req.credentials,
    cache: req.cache,
    redirect: req.redirect,
    integrity: req.integrity,
  });

  return await app.fetch(newReq, Deno.env.toObject());
}

async function detectPublicIp() {
  try {
    // Try to fetch aws ec2 metadata
    const requests = [
      fetch("http://169.254.169.254/latest/meta-data/local-ipv4"),
      fetch("http://100.100.100.200/latest/meta-data/eipv4").then((res) => {
        return res.status <= 299 ? res : Promise.reject();
      }),
    ];
    console.log("Fetching public IP...");
    // Wait for the first request to resolve
    const responsePromise = Promise.any(requests);
    const response = await Promise.race<Response>([
      responsePromise,
      new Promise((_, reject) => setTimeout(reject, 1000)),
    ]);
    const publicIp = await response.text();
    console.log("Public IP:", publicIp);
    return publicIp;
  } catch (_e) {
    console.log("No public IP found");
    return null;
  }
}

async function init() {
  if (!Deno.env.get("PUBLIC_IP")) {
    const publicIp = await detectPublicIp();
    if (publicIp) Deno.env.set("PUBLIC_IP", publicIp);
  }
}

init();

serve(handler, { port: 11733 });
