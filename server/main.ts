import { ConnInfo, serve, serveDir, serveFile } from "./deps.ts";

import app from "./app.ts";
import { websocketHandler, websocketProxyHandler } from "./ws.ts";

app.post("/api/:endpoint{whip|whep}", (c) => {
  return websocketProxyHandler(c.req.raw);
});

async function handler(req: Request, connInfo: ConnInfo): Promise<Response> {
  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() === "websocket") {
    return websocketHandler(req, connInfo);
  }

  const __dirname = new URL(".", import.meta.url).pathname;
  const pathname = new URL(req.url).pathname;
  if (!pathname.startsWith("/api")) {
    if (pathname === "/backend")
      return new Response(null, {
        status: 301,
        headers: { Location: "/backend/" },
      });

    if (pathname.startsWith("/backend/")) {
      return serveDir(req, {
        fsRoot: `${__dirname}backend`,
        urlRoot: "backend",
      });
    }
    return serveDir(req, { fsRoot: "./build" });
  }

  if (
    (pathname === "/api/whip" || pathname === "/api/whep") &&
    req.method === "GET" &&
    req.headers.get("accept")?.startsWith("text/html")
  ) {
    return serveFile(req, `${__dirname}proxy.html`);
  }

  return app.fetch(req, Deno.env.toObject());
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

function corsHandler(
  handler: (req: Request, connInfo: ConnInfo) => Promise<Response>
) {
  return async (req: Request, connInfo: ConnInfo) => {
    const response = await handler(req, connInfo);
    if (response.status === 101) return response;
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    newResponse.headers.set("Access-Control-Allow-Methods", "*");
    newResponse.headers.set("Access-Control-Allow-Headers", "*");
    newResponse.headers.set("Access-Control-Expose-Headers", "*");
    return newResponse;
  };
}

async function init() {
  if (!Deno.env.get("PUBLIC_IP")) {
    const publicIp = await detectPublicIp();
    if (publicIp) Deno.env.set("PUBLIC_IP", publicIp);
  }

  if (Deno.env.get("HEADLESS_CHROMIUM")) {
    Deno.run({
      cmd: [
        "chromium-browser",
        "--headless",
        "--no-sandbox",
        "--remote-debugging-port=0",
        Deno.env.get("HEADLESS_CHROMIUM")!,
      ],
    });
  }

  if (Deno.env.get("ADMIN_PASSWORD")) {
    const adminUsername = Deno.env.get("ADMIN_USERNAME") || "admin";
    const initialChannel = {
      id: adminUsername,
      title: "",
      thumbnail: "",
    };
    app.fetch(
      new Request(new URL("/api/channels", "http://localhost"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            btoa(adminUsername + ":" + Deno.env.get("ADMIN_PASSWORD")!),
        },
        body: JSON.stringify(initialChannel),
      }),
      Deno.env.toObject()
    );
  }
}

init();

serve(corsHandler(handler), { port: 11733 });
