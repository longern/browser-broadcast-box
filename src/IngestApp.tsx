import React, { useState } from "react";

import { Dialog, DialogContent } from "@mui/material";
import IngestFooter from "./components/IngestFooter";
import IngestForm from "./components/IngestForm";
import VideoStream from "./IngestDesktop/VideoStream";
import {
  MessagesContext,
  SetMessagesContext,
} from "./contexts/MessagesContext";
import { Box } from "@mui/system";

function IngestApp() {
  const [open, setOpen] = useState(true);
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const [messages, setMessages] = useState([] as any[]);
  const [views, setViews] = useState(0);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  async function handleDeviceChange(deviceId: string | null) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (!deviceId) return setStream(undefined);

    if (deviceId === "screen") {
      const newStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: 1920,
          height: 1080,
          displaySurface: "monitor",
        } as MediaTrackConstraints,
        audio: {
          channelCount: 2,
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      newStream.getVideoTracks()[0].contentHint = "motion";
      setStream(newStream);
    } else {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId,
          width: 1920,
          height: 1080,
        },
        audio: {
          channelCount: 2,
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      setStream(newStream);
    }
  }

  async function handleStartStream(options: {
    liveUrl: string;
    title?: string;
  }) {
    const { liveUrl, title } = options;
    import("./WHIPClient").then((WHIPClientModule) => {
      const WHIPClient = WHIPClientModule.default;
      const client = new WHIPClient(liveUrl, stream);
      setOpen(false);

      client.peerConnection.addEventListener(
        "icegatheringstatechange",
        (_ev) => {
          if (client.peerConnection.iceGatheringState !== "complete") return;
          client.peerConnection.getSenders().forEach((sender) => {
            if (sender.track?.kind === "video") {
              const parameters = sender.getParameters();
              parameters.encodings[0].maxBitrate = 5000000;
              sender.setParameters(parameters);
            }
          });
        }
      );

      client.peerConnection.addEventListener(
        "connectionstatechange",
        function () {
          if (this.connectionState === "connected") {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            const videoElement = videoRef.current!;
            if (videoElement.videoWidth > videoElement.videoHeight) {
              canvas.width = 320;
              canvas.height = 180;
              context!.drawImage(videoElement, 0, 0, 320, 180);
            } else {
              canvas.width = 180;
              canvas.height = 320;
              context!.drawImage(videoElement, 0, 0, 180, 320);
            }

            fetch("/api/channels/admin", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                live: true,
                title,
                thumbnail: canvas.toDataURL("image/jpeg", 0.5),
              }),
            });
          }
        }
      );

      client.dataChannel.addEventListener("message", (ev) => {
        const data = JSON.parse(ev.data);
        const { type, id, body } = data;
        if (type === "message") {
          setMessages((messages) => {
            const newMessages = [{ id, content: body }, ...messages];
            if (newMessages.length > 1000) newMessages.pop();
            return newMessages;
          });
        } else if (data.type === "views") {
          setViews(+body);
        }
      });

      client.dataChannel.addEventListener("open", () => {
        client.dataChannel.send(
          JSON.stringify({
            type: "meta",
            id: crypto.randomUUID(),
            body: { title },
          })
        );
      });
    });
  }

  async function handleStopStream() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setOpen(true);
  }

  return (
    <div className="App">
      <MessagesContext.Provider value={messages}>
        <SetMessagesContext.Provider value={setMessages}>
          <Dialog open={open} fullWidth>
            <DialogContent>
              <IngestForm
                onDeviceChange={handleDeviceChange}
                onStartStream={handleStartStream}
              />
            </DialogContent>
          </Dialog>
          <VideoStream
            ref={videoRef}
            stream={stream}
            autoPlay
            playsInline
            muted
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              zIndex: -1,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 9999,
              backgroundColor: "rgba(127, 127, 127, 0.5)",
            }}
          >
            {views}
          </Box>
          <IngestFooter onStopClick={handleStopStream} />
        </SetMessagesContext.Provider>
      </MessagesContext.Provider>
    </div>
  );
}

export default IngestApp;
