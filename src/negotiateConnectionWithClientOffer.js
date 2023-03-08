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
 *
 * @param {RTCPeerConnection} peerConnection
 * @param {string | URL} endpoint
 * @returns {Promise<string | null>}
 */
export default async function negotiateConnectionWithClientOffer(
  peerConnection,
  endpoint
) {
  /** https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer */
  const offer = await peerConnection.createOffer();
  /** https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription */
  await peerConnection.setLocalDescription(offer);
  /** Wait for ICE gathering to complete */
  let ofr = await waitToCompleteICEGathering(peerConnection);
  if (!ofr) {
    throw Error("failed to gather ICE candidates for offer");
  }

  /**
   * This response contains the server's SDP offer.
   * This specifies how the client should communicate,
   * and what kind of media client and server have negotiated to exchange.
   */
  let response = await postSDPOffer(endpoint, ofr.sdp);
  if (response.status <= 299) {
    let answerSDP = await response.text();
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({ type: "answer", sdp: answerSDP })
    );
    const loc = response.headers.get("Location");
    if (loc) {
      if (loc.startsWith("http")) {
        // absolute path
        return loc;
      } else {
        // relative path
        const parsed = new URL(endpoint);
        parsed.pathname = loc;
        return parsed.toString();
      }
    }
    return null;
  } else if (response.status === 405) {
    console.log(
      "Remember to update the URL passed into the WHIP or WHEP client"
    );
  } else {
    const errorMessage = await response.text();
    console.error(errorMessage);
  }
}

async function postSDPOffer(endpoint, data) {
  const request = new Request(endpoint, {
    method: "POST",
    mode: "cors",
    headers: { "content-type": "application/sdp" },
    body: data,
  });

  const url = new URL(request.url);
  if (window.location.protocol === "https:") {
    if (
      url.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ) {
      const response = await new Promise((resolve, reject) => {
        // Create popup window
        window.popup = window.open(url.origin, "_blank");

        const intervalId = setInterval(() => {
          if (window.popup.closed) reject(new Error("Popup closed"));
        }, 1000);

        window.addEventListener("message", async (event) => {
          const { data, origin } = event;
          if (origin !== url.origin) return;

          if (data.type === "event" && data.event === "load") {
            window.popup.postMessage(
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
            window.popup.close();
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
  }

  return await fetch(request);
}

/**
 * Receives an RTCPeerConnection and waits until
 * the connection is initialized or a timeout passes.
 *
 * https://www.ietf.org/archive/id/draft-ietf-wish-whip-01.html#section-4.1
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceGatheringState
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event
 *
 * @param {RTCPeerConnection} peerConnection
 * @returns {Promise<RTCSessionDescription | null>}
 */
async function waitToCompleteICEGathering(peerConnection) {
  return new Promise((resolve) => {
    /** Wait at most 1 second for ICE gathering. */
    setTimeout(function () {
      resolve(peerConnection.localDescription);
    }, 1000);
    peerConnection.onicegatheringstatechange = (ev) =>
      peerConnection.iceGatheringState === "complete" &&
      resolve(peerConnection.localDescription);
  });
}
