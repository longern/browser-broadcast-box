import { serve } from "./deps.ts";

let globalSocket: WebSocket | null = null;
const handlerMap = new Map<string, Request>();

// WebSocket handler
function websocketHandler(req: Request, connInfo): Response {
  if (connInfo.remoteAddr.hostname !== "127.0.0.1") {
    return new Response("Not Allowed", { status: 403 });
  }

  if (globalSocket !== null) {
    return new Response("Already Connected", { status: 409 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.onopen = () => {
    const env: Record<string, string> = {};
    if (Deno.env.get("PUBLIC_IP")) env.PUBLIC_IP = Deno.env.get("PUBLIC_IP");
    socket.send(JSON.stringify({ type: "env", items: env }));
    const remoteSocket = `${connInfo.remoteAddr.hostname}:${connInfo.remoteAddr.port}`;
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
  socket.onerror = (e) => console.log("socket errored:", e.message);
  socket.onclose = () => (globalSocket = null);
  globalSocket = socket;
  return response;
}

async function handler(req: Request, connInfo): Promise<Response> {
  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() === "websocket") {
    return websocketHandler(req, connInfo);
  }

  if (new URL(req.url).pathname === "/") {
    const index = await Deno.readTextFile("./index.html");
    return new Response(index, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
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
      body: req.body ? btoa(await req.text()) : null,
    })
  );

  const response = await new Promise<Response>((resolve) => {
    handlerMap[requestID] = (data) => {
      const { status, headers, body } = data;
      const responseBody = body ? atob(body) : null;
      resolve(new Response(responseBody, { status, headers }));
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
  } catch (e) {
    console.log("No public IP found");
    return null;
  }
}

function corsHandler(handler: (req: Request, connInfo) => Promise<Response>) {
  return async (req: Request, connInfo) => {
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
      Deno.env.get("HEADLESS_CHROMIUM"),
    ],
  });
}

serve(corsHandler(handler), { port: 11733 });
