export let globalSocket: WebSocket | null = null;

const handlerMap: Record<
  string,
  (data: {
    status: number;
    headers: Record<string, string>;
    body: string | null;
  }) => void
> = {};

export function websocketHandler(req: Request, connInfo: ConnInfo): Response {
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
    const envAdminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (envAdminPassword) env.ADMIN_PASSWORD = envAdminPassword;
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
