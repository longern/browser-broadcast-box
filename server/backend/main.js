const environ = {};
const resources = {};
let stream = null;
let channel = {
  resource: null,
  liveViewers: 0,
};
const videoElement = document.createElement("video");
videoElement.muted = true;

const searchParams = new URLSearchParams(location.search);
const socket = searchParams.get("s") || "127.0.0.1:11733";
const ws = new WebSocket(`ws://${socket}`);

function randomUUID() {
  let array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  let uuid = "";
  for (let i = 0; i < array.length; i++) {
    uuid += ("0" + array[i].toString(16)).slice(-2);
  }
  return (
    uuid.substr(0, 8) +
    "-" +
    uuid.substr(8, 4) +
    "-" +
    uuid.substr(12, 4) +
    "-" +
    uuid.substr(16, 4) +
    "-" +
    uuid.substr(20)
  );
}

/** @param {RTCPeerConnection} peerConnection */
function waitToCompleteICEGathering(peerConnection) {
  return new Promise((resolve) => {
    /** Wait at most 200ms for ICE gathering. */
    setTimeout(function () {
      resolve(peerConnection.localDescription);
    }, 200);
    peerConnection.onicegatheringstatechange = (_ev) =>
      peerConnection.iceGatheringState === "complete" &&
      resolve(peerConnection.localDescription);
  });
}

function sendLiveViewers(resourceId) {
  const dataChannel = resources[resourceId]?.dataChannel;
  if (!dataChannel) return;
  dataChannel.send(
    JSON.stringify({
      type: "views",
      body: channel.liveViewers,
    })
  );
}

/** @param {Request} req */
async function handleWhipEndpoint(req) {
  if (req.method !== "POST") {
    return new Response("405 Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const offer = await req.text();
  const peerConnection = new RTCPeerConnection();
  const resourceId = randomUUID();
  resources[resourceId] = { peerConnection, dataChannel: null };

  peerConnection.addEventListener("track", (event) => {
    stream = event.streams[0];
    channel.resource = resourceId;
    // Force audio decoding otherwise the audio will be silent.
    videoElement.srcObject = stream;
  });

  peerConnection.addEventListener("datachannel", (event) => {
    const dataChannel = event.channel;
    dataChannel.addEventListener("message", (event) => {
      const message = event.data;
      console.log(`Received message from ${resourceId}:`, message);
    });
    resources[resourceId].dataChannel = dataChannel;
    dataChannel.send(
      JSON.stringify({
        type: "message",
        id: randomUUID(),
        body: "Connected to media server",
      })
    );
  });

  const csListener = peerConnection.addEventListener(
    "connectionstatechange",
    (_ev) => {
      if (["failed", "closed"].includes(peerConnection.connectionState)) {
        peerConnection.removeEventListener("connectionstatechange", csListener);
        delete resources[resourceId];
        channel.resource = null;
        channel.liveViewers = 0;
      }
    }
  );

  peerConnection.setRemoteDescription({ type: "offer", sdp: offer });
  let answer = await peerConnection.createAnswer();
  peerConnection.setLocalDescription(answer);
  answer = await waitToCompleteICEGathering(peerConnection);
  if (environ.PUBLIC_IP) {
    // Replace local mDNS hostname with public IP.
    answer.sdp = answer.sdp.replace(/[A-Za-z0-9-]+\.local/g, environ.PUBLIC_IP);
  }

  const origin = new URL(req.url).origin;
  return new Response(answer.sdp, {
    status: 201,
    headers: {
      "Content-Type": "application/sdp",
      Location: `${origin}/resource/${resourceId}`,
    },
  });
}

/** @param {Request} req */
async function handleWhepEndpoint(req) {
  if (req.method !== "POST") {
    return new Response("405 Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  if (!stream) {
    return new Response("404 Not Found", { status: 404 });
  }

  const offer = await req.text();
  const peerConnection = new RTCPeerConnection();
  peerConnection.setRemoteDescription({ type: "offer", sdp: offer });

  for (const track of stream.getTracks()) {
    peerConnection.addTrack(track);
  }

  peerConnection.addEventListener("icegatheringstatechange", (_ev) => {
    if (peerConnection.iceGatheringState !== "complete") return;
    peerConnection.getSenders().forEach((sender) => {
      if (sender.track?.kind === "video") {
        const parameters = sender.getParameters();
        parameters.encodings[0].maxBitrate = 5000000;
        sender.setParameters(parameters);
      }
    });
  });

  peerConnection.addEventListener("datachannel", (event) => {
    const dataChannel = event.channel;
    dataChannel.addEventListener("message", (event) => {
      let id, message;
      try {
        const data = JSON.parse(event.data);
        id = data.id;
        message = data.content;
      } catch (_e) {
        console.error("Failed to parse message:", event.data);
        return;
      }

      console.log(`Received message from ${resourceId}:`, message);
      if (!resources[channel.resource]) return;
      resources[channel.resource].dataChannel.send(
        JSON.stringify({
          type: "message",
          id,
          body: message,
        })
      );
    });
    resources[resourceId].dataChannel = dataChannel;
  });

  const csListener = peerConnection.addEventListener(
    "connectionstatechange",
    (_ev) => {
      if (["failed", "closed"].includes(peerConnection.connectionState)) {
        peerConnection.removeEventListener("connectionstatechange", csListener);
        delete resources[resourceId];
        if (!channel.resource) return;
        channel.liveViewers--;
        sendLiveViewers(channel.resource);
      }
    }
  );

  let answer = await peerConnection.createAnswer();
  peerConnection.setLocalDescription(answer);
  answer = await waitToCompleteICEGathering(peerConnection);
  if (environ.PUBLIC_IP) {
    answer.sdp = answer.sdp.replace(/[A-Za-z0-9-]+\.local/g, environ.PUBLIC_IP);
  }

  const resourceId = randomUUID();
  resources[resourceId] = { peerConnection, dataChannel: null };
  channel.liveViewers++;
  sendLiveViewers(channel.resource);

  const origin = new URL(req.url).origin;
  return new Response(answer.sdp, {
    status: 201,
    headers: {
      "Content-Type": "application/sdp",
      Location: `${origin}/resource/${resourceId}`,
    },
  });
}

/** @param {Request} req */
async function handleResource(req) {
  const url = new URL(req.url);
  if (req.method !== "DELETE") {
    return new Response("405 Method Not Allowed", {
      status: 405,
      headers: { Allow: "DELETE" },
    });
  }

  const resourceId = url.pathname.split("/").pop();
  const resource = resources[resourceId];
  if (!resource) {
    return new Response("404 Not Found", { status: 404 });
  }
  const { peerConnection } = resource;
  peerConnection.close();
  delete resources[resourceId];
  return new Response(null, { status: 204 });
}

async function handleChannels(req) {
  if (req.method !== "GET") {
    return new Response("405 Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  const channels = [];
  if (channel.resource) {
    channels.push({
      id: channel.resource,
    });
  }

  return new Response(JSON.stringify({ channels }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** @param {Request} req */
async function handlePath(req) {
  const url = new URL(req.url);
  switch (url.pathname) {
    case "/api/whip":
      return handleWhipEndpoint(req);
    case "/api/whep":
      return handleWhepEndpoint(req);
    case "/api/channels":
      return handleChannels(req);
  }

  if (url.pathname.startsWith("/resource/")) {
    return handleResource(req);
  }

  return new Response("404 Not Found", { status: 404 });
}

ws.onmessage = async (ev) => {
  const event = JSON.parse(ev.data);
  if (event.type === "env") {
    Object.assign(environ, event.items);
    return;
  }

  if (event.type !== "request") return;

  const requestId = event.id;
  const request = new Request(event.url, {
    method: event.method,
    headers: event.headers,
    body: event.body,
  });

  let response;
  try {
    response = await handlePath(request);
  } catch (e) {
    response = new Response(e.message, { status: 500 });
  }

  ws.send(
    JSON.stringify({
      type: "response",
      id: requestId,
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    })
  );
};
