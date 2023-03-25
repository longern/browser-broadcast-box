export let globalSocket: WebSocket | null = null;

const handlerMap: Record<
  string,
  (data: {
    status: number;
    headers: Record<string, string>;
    body: string | null;
  }) => void
> = {};

const logger = {
  log(...args: any[]) {
    const time = new Date().toLocaleTimeString([], {
      hour12: false,
    });
    console.log(`[${time}]`, ...args);
  },
};

export function websocketHandler(req: Request): Response {
  const connectingIp = req.headers.get("CF-Connecting-IP");
  const host = req.headers.get("Host");
  const isDockerIp = connectingIp?.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
  if (
    connectingIp !== "127.0.0.1" &&
    !(host === "backend:11733" && isDockerIp)
  ) {
    console.log("Not allowed", connectingIp, host);
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
    logger.log("Backend socket connected");
  };
  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "response") {
        handlerMap[data.id](data);
        delete handlerMap[data.id];
      }
    } catch (e) {
      logger.log(e);
    }
  };
  socket.onerror = (e) =>
    logger.log("socket errored:", (<ErrorEvent>e).message);
  socket.onclose = () => (globalSocket = null);
  globalSocket = socket;
  return response;
}

export async function websocketProxyHandler(req: Request) {
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
