/**
 * Performs the actual SDP exchange.
 *
 * 1. Constructs the client's SDP offer
 * 2. Sends the SDP offer to the server,
 * 3. Awaits the server's offer.
 *
 * SDP describes what kind of media we can send and how the server and client communicate.
 *
 * https://developer.mozilla.org/en-US/docs/Glossary/SDP
 * https://www.ietf.org/archive/id/draft-ietf-wish-whip-01.html#name-protocol-operation
 */
export default async function negotiateConnectionWithClientOffer(
  peerConnection: RTCPeerConnection,
  endpoint: string | URL,
  options?: {
    authToken?: string;
  }
) {
  /** https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer */
  const offer = await peerConnection.createOffer();
  /** https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription */
  await peerConnection.setLocalDescription(offer);
  /** Wait for ICE gathering to complete */
  let ofr = await waitToCompleteICEGathering(peerConnection);
  if (!ofr || !ofr.sdp) {
    throw Error("failed to gather ICE candidates for offer");
  }

  /**
   * This response contains the server's SDP offer.
   * This specifies how the client should communicate,
   * and what kind of media client and server have negotiated to exchange.
   */
  let response = await postSDPOffer(endpoint, ofr.sdp, {
    authToken: options?.authToken,
    httpPopupProxy: true,
  });
  if (response.status >= 400) {
    const errorMessage = await response.text();
    try {
      throw new Error(JSON.parse(errorMessage).messages[0].message);
    } catch (_err) {
      throw new Error(errorMessage);
    }
  }
  let answerSDP = await response.text();
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription({ type: "answer", sdp: answerSDP })
  );
  const loc = response.headers.get("Location");
  if (!loc) return null;
  else if (loc.startsWith("http")) {
    // absolute path
    return loc;
  } else {
    // relative path
    const parsed = new URL(endpoint);
    parsed.pathname = loc;
    return parsed.toString();
  }
}

async function postSDPOffer(
  endpoint: string | URL,
  data: string,
  options?: {
    authToken?: string;
    httpPopupProxy?: boolean;
    method?: string;
  }
) {
  options = options || {};
  const method = options.method || "POST";

  const headers = new Headers();
  headers.set("content-type", "application/sdp");
  if (options.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  }
  const request = new Request(endpoint, {
    method,
    mode: "cors",
    headers,
    body: data,
  });

  const url = new URL(request.url);
  if (
    options.httpPopupProxy &&
    window.location.protocol === "https:" &&
    url.protocol === "http:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    const response = await new Promise<Response>((resolve, reject) => {
      // Create popup window
      const popup = window.open(url, "_blank");
      if (!popup) {
        reject(new Error("Failed to open popup"));
        return;
      }

      const intervalId = setInterval(() => {
        if (popup.closed) reject(new Error("Popup closed"));
      }, 1000);

      window.addEventListener("message", async (event) => {
        const { data, origin } = event;
        if (origin !== url.origin) return;

        if (data.type === "event" && data.event === "load") {
          popup.postMessage(
            {
              type: "request",
              url: request.url,
              method: request.method,
              headers: Object.fromEntries(request.headers),
              body: await request.text(),
            },
            url.origin
          );
        } else if (data.type === "response") {
          clearInterval(intervalId);
          popup.close();
          const response = new Response(data.body, {
            status: data.status,
            statusText: data.statusText,
            headers: data.headers,
          });
          resolve(response);
        }
      });
    });
    return response;
  }

  return fetch(request);
}

/**
 * Receives an RTCPeerConnection and waits until
 * the connection is initialized or a timeout passes.
 *
 * https://www.ietf.org/archive/id/draft-ietf-wish-whip-01.html#section-4.1
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceGatheringState
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event
 */
async function waitToCompleteICEGathering(peerConnection: RTCPeerConnection) {
  return new Promise<RTCSessionDescriptionInit | null>((resolve) => {
    /** Wait at most 1 second for ICE gathering. */
    setTimeout(function () {
      resolve(peerConnection.localDescription);
    }, 1000);
    peerConnection.onicegatheringstatechange = (_ev) =>
      peerConnection.iceGatheringState === "complete" &&
      resolve(peerConnection.localDescription);
  });
}
