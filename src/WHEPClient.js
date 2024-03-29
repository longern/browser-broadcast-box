import { preferCodec } from "./codecs";
import negotiateConnectionWithClientOffer from "./negotiateConnectionWithClientOffer";
/**
 * Example implementation of a client that uses WHEP to playback video over WebRTC
 *
 * https://www.ietf.org/id/draft-murillo-whep-00.html
 */
export default class WHEPClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.stream = new MediaStream();
    /**
     * Create a new WebRTC connection, using public STUN servers with ICE,
     * allowing the client to disover its own IP address.
     * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols#ice
     */
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.cloudflare.com:3478",
        },
      ],
      bundlePolicy: "max-bundle",
    });
    /** https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTransceiver */
    const videoTransceiver = this.peerConnection.addTransceiver("video", {
      direction: "recvonly",
    });
    this.peerConnection.addTransceiver("audio", {
      direction: "recvonly",
    });
    let recvCodecs = RTCRtpReceiver.getCapabilities("video").codecs;
    recvCodecs = preferCodec(recvCodecs, "video/VP9");
    videoTransceiver.setCodecPreferences(recvCodecs);

    this.dataChannel = this.peerConnection.createDataChannel("whep");
    this.dataChannel.addEventListener("open", () => {
      console.log("WHEP data channel open");
    });

    /**
     * When new tracks are received in the connection, store local references,
     * so that they can be added to a MediaStream, and to the <video> element.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/track_event
     */
    this.peerConnection.ontrack = (event) => {
      const track = event.track;
      const currentTracks = this.stream.getTracks();
      const streamAlreadyHasVideoTrack = currentTracks.some(
        (track) => track.kind === "video"
      );
      const streamAlreadyHasAudioTrack = currentTracks.some(
        (track) => track.kind === "audio"
      );
      switch (track.kind) {
        case "video":
          if (streamAlreadyHasVideoTrack) {
            break;
          }
          this.stream.addTrack(track);
          break;
        case "audio":
          if (streamAlreadyHasAudioTrack) {
            break;
          }
          this.stream.addTrack(track);
          break;
        default:
          console.log("got unknown track " + track);
      }
    };
    this.peerConnection.addEventListener("connectionstatechange", (ev) => {
      if (this.peerConnection.connectionState === "closed") {
        window.alert("Connection closed");
      }
    });
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
}
