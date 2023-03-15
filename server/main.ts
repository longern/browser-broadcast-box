import { serve, ConnInfo } from "./deps.ts";
import { serveDir, serveFile } from "./deps.ts";

let globalSocket: WebSocket | null = null;
const handlerMap: Record<
  string,
  (data: {
    status: number;
    headers: Record<string, string>;
    body: string | null;
  }) => void
> = {};

// WebSocket handler
function websocketHandler(req: Request, connInfo: ConnInfo): Response {
  const remoteAddr = connInfo.remoteAddr as Deno.NetAddr;
  if (remoteAddr.hostname !== "127.0.0.1") {
    return new Response("Not Allowed", { status: 403 });
  }

  if (globalSocket !== null) {
    return new Response("Already Connected", { status: 409 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.onopen = () => {
    const env: Record<string, string> = {};
    const envPublicIp = Deno.env.get("PUBLIC_IP");
    if (envPublicIp) env.PUBLIC_IP = envPublicIp;
    socket.send(JSON.stringify({ type: "env", items: env }));
    const remoteSocket = `${remoteAddr.hostname}:${remoteAddr.port}`;
    console.log(`Backend socket ${remoteSocket} connected`);
  };
  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "response") {
        handlerMap[data.id](data);
        delete handlerMap[data.id];
      }
    } catch (e) {
      console.log(e);
    }
  };
  socket.onerror = (e) =>
    console.log("socket errored:", (<ErrorEvent>e).message);
  socket.onclose = () => (globalSocket = null);
  globalSocket = socket;
  return response;
}

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
    req.method === "GET" &&
    pathname === "/api/whip" &&
    req.headers.get("accept")?.startsWith("text/html")
  ) {
    return serveFile(req, `${__dirname}proxy.html`);
  }

  if (globalSocket === null) {
    return new Response("503 Service Unavailable", { status: 503 });
  }

  const requestID = crypto.randomUUID();
  globalSocket.send(
    JSON.stringify({
      type: "request",
      id: requestID,
      method: req.method,
      headers: Object.fromEntries(req.headers),
      url: req.url,
      body: req.body ? await req.text() : null,
    })
  );

  const response = await new Promise<Response>((resolve) => {
    handlerMap[requestID] = (data) => {
      const { status, headers, body } = data;
      resolve(new Response(body, { status, headers }));
    };
    setTimeout(() => {
      resolve(new Response("Request Timeout", { status: 408 }));
    }, 10000);
  });

  return response;
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
      Deno.env.get("HEADLESS_CHROMIUM") || "",
    ],
  });
}

serve(corsHandler(handler), { port: 11733 });
