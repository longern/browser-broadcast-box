const environ = {};
const resources = {};
let stream = null;
let channel = {
  resource: null,
  title: null,
  thumbnail: null,
};
const videoElement = document.createElement("video");
videoElement.muted = true;
let liveViewers = 0;

const searchParams = new URLSearchParams(location.search);
const port = searchParams.get("port") || 11733;
const ws = new WebSocket(`ws://127.0.0.1:${port}`);

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
  const dataChannel = resources[resourceId].dataChannel;
  if (!dataChannel) return;
  dataChannel.send(
    JSON.stringify({
      type: "views",
      body: liveViewers,
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
  const resourceId = crypto.randomUUID();
  resources[resourceId] = { peerConnection, dataChannel: null };

  peerConnection.addEventListener("track", (event) => {
    stream = event.streams[0];
    channel.resource = resourceId;
    // Force audio decoding otherwise the audio will be silent.
    videoElement.srcObject = stream;
    // Generate a thumbnail for the stream.
    const listener = videoElement.addEventListener("canplay", async () => {
      videoElement.removeEventListener("canplay", listener);
      await videoElement.play();

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (videoElement.videoWidth > videoElement.videoHeight) {
        canvas.width = 320;
        canvas.height = 180;
        context.drawImage(videoElement, 0, 0, 320, 180);
      } else {
        canvas.width = 180;
        canvas.height = 320;
        context.drawImage(videoElement, 0, 0, 180, 320);
      }
      channel.thumbnail = canvas.toDataURL();
    });
  });

  peerConnection.addEventListener("datachannel", (event) => {
    const dataChannel = event.channel;
    dataChannel.addEventListener("message", (event) => {
      const message = event.data;
      console.log(`Received message from ${resourceId}:`, message);
      const { type, body } = JSON.parse(message);
      if (type === "meta") {
        channel.title = body.title;
      }
    });
    resources[resourceId].dataChannel = dataChannel;
    dataChannel.send(
      JSON.stringify({
        type: "message",
        id: crypto.randomUUID(),
        body: "Connected to media server",
      })
    );
  });

  peerConnection.setRemoteDescription({ type: "offer", sdp: offer });
  let answer = await peerConnection.createAnswer();
  peerConnection.setLocalDescription(answer);
  answer = await waitToCompleteICEGathering(peerConnection);
  if (environ.PUBLIC_IP) {
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
        message = data.message;
      } catch (_e) {
        console.error("Failed to parse message:", event.data);
        return;
      }

      console.log(`Received message from ${resourceId}:`, message);
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

  peerConnection.addEventListener("connectionstatechange", (_ev) => {
    if (["failed", "closed"].includes(peerConnection.connectionState)) {
      delete resources[resourceId];
      liveViewers--;
      sendLiveViewers(channel.resource);
    }
  });

  let answer = await peerConnection.createAnswer();
  peerConnection.setLocalDescription(answer);
  answer = await waitToCompleteICEGathering(peerConnection);
  if (environ.PUBLIC_IP) {
    answer.sdp = answer.sdp.replace(/[A-Za-z0-9-]+\.local/g, environ.PUBLIC_IP);
  }

  const resourceId = crypto.randomUUID();
  resources[resourceId] = { peerConnection, dataChannel: null };
  liveViewers++;
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
      title: channel.title || channel.resource,
      thumbnail: channel.thumbnail,
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
    body: typeof event.body === "string" ? atob(event.body) : null,
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
      body: btoa(await response.text()),
    })
  );
};
