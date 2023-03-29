import { preferCodec } from "./codecs";
import negotiateConnectionWithClientOffer from "./negotiateConnectionWithClientOffer";
/**
 * Example implementation of a client that uses WHIP to broadcast video over WebRTC
 *
 * https://www.ietf.org/archive/id/draft-ietf-wish-whip-01.html
 */
// WHIPClient is an event emitter that emits the following events:
export default class WHIPClient extends EventTarget {
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null = null;

  #endpoint: string;
  #resourceURL: string | null = null;

  constructor(
    endpoint: string,
    mediaStream: MediaStream,
    options: {
      authToken?: string;
      enableDataChannel?: boolean;
      iceServers?: RTCIceServer[] | true;
      maxBitrate?: number;
      preferredCodec?: string;
    }
  ) {
    super();
    options = options || {};

    this.#endpoint = endpoint;

    if (options.iceServers === true)
      options.iceServers = [{ urls: "stun:stun.cloudflare.com:3478" }];
    this.peerConnection = new RTCPeerConnection({
      iceServers: options.iceServers,
      bundlePolicy: "max-bundle",
    });

    mediaStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, mediaStream);
    });

    const transceivers = this.peerConnection.getTransceivers();
    const preferredCodec = options.preferredCodec;
    if (preferredCodec) {
      transceivers.forEach((transceiver) => {
        const track = transceiver.sender.track;
        if (!track) return;
        const kind = track.kind;
        const capabilities = RTCRtpSender.getCapabilities(kind);
        if (!capabilities) return;
        let sendCodecs = capabilities.codecs;

        if (kind === "video") {
          sendCodecs = preferCodec(sendCodecs, preferredCodec);
          transceiver.setCodecPreferences(sendCodecs);
        }
      });
    }

    if (options.maxBitrate) {
      this.peerConnection.addEventListener(
        "icegatheringstatechange",
        function () {
          if (this.iceGatheringState !== "complete") return;
          this.getSenders().forEach((sender) => {
            if (sender.track?.kind === "video") {
              const parameters = sender.getParameters();
              parameters.encodings[0].maxBitrate = 5000000;
              sender.setParameters(parameters);
            }
          });
        }
      );
    }

    if (options.enableDataChannel) {
      this.dataChannel = this.peerConnection.createDataChannel("whip");
      this.dataChannel.addEventListener("open", () => {
        console.log("Data channel open");
      });
    }

    /**
     * Listen for negotiationneeded events, and use WHIP as the signaling protocol to establish a connection
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/negotiationneeded_event
     * https://www.ietf.org/archive/id/draft-ietf-wish-whip-01.html
     */
    this.peerConnection.addEventListener("negotiationneeded", async (ev) => {
      console.log("Connection negotiation starting");
      try {
        this.#resourceURL = await negotiateConnectionWithClientOffer(
          this.peerConnection,
          this.#endpoint,
          { authToken: options.authToken }
        );
      } catch (err) {
        window.alert(err);
      }
      console.log("Connection negotiation ended");
    });
  }

  /**
   * Terminate the streaming session
   * 1. Notify the WHIP server by sending a DELETE request
   * 2. Close the WebRTC connection
   * 3. Stop using the local camera and microphone
   *
   * Note that once you call this method, this instance of this WHIPClient cannot be reused.
   */
  async disconnectStream() {
    if (!this.#resourceURL) return;
    await fetch(this.#resourceURL, {
      method: "DELETE",
      mode: "cors",
    });
    this.peerConnection.close();
  }
}
