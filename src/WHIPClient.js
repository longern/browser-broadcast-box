import negotiateConnectionWithClientOffer from "./negotiateConnectionWithClientOffer.js";
/**
 * Example implementation of a client that uses WHIP to broadcast video over WebRTC
 *
 * https://www.ietf.org/archive/id/draft-ietf-wish-whip-01.html
 */
export default class WHIPClient {
  constructor(endpoint, mediaStream) {
    this.endpoint = endpoint;
    /**
     * Create a new WebRTC connection, using public STUN servers with ICE,
     * allowing the client to disover its own IP address.
     * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols#ice
     */
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      bundlePolicy: "max-bundle",
    });

    mediaStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, mediaStream);
    });

    this.dataChannel = this.peerConnection.createDataChannel("whip");
    this.dataChannel.addEventListener("open", () => {
      console.log("Data channel open");
    });

    /**
     * Listen for negotiationneeded events, and use WHIP as the signaling protocol to establish a connection
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/negotiationneeded_event
     * https://www.ietf.org/archive/id/draft-ietf-wish-whip-01.html
     */
    this.peerConnection.addEventListener("negotiationneeded", async (ev) => {
      console.log("Connection negotiation starting");
      try {
        this.resourceURL = await negotiateConnectionWithClientOffer(
          this.peerConnection,
          this.endpoint
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
    var _a;
    if (!this.resourceURL) {
      return;
    }
    await fetch(this.resourceURL, {
      method: "DELETE",
      mode: "cors",
    });
    this.peerConnection.close();
    (_a = this.localStream) === null || _a === void 0
      ? void 0
      : _a.getTracks().forEach((track) => track.stop());
  }
}
