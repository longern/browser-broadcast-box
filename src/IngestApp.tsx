import React, { useEffect, useState } from "react";
import { Box } from "@mui/system";
import { Dialog, DialogContent } from "@mui/material";

import IngestFooter from "./components/IngestFooter";
import IngestForm from "./components/IngestForm";
import VideoStream from "./IngestDesktop/VideoStream";
import WHIPClient from "./WHIPClient";

function IngestApp() {
  const [open, setOpen] = useState(true);
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const [messages, setMessages] = useState([] as any[]);
  const [views, setViews] = useState(0);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const client = React.useRef<WHIPClient | null>(null);

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
    authToken?: string;
    title?: string;
  }) {
    if (!stream) return;
    const { liveUrl, authToken, title } = options;
    client.current = new WHIPClient(liveUrl, stream, {
      authToken,
      enableDataChannel: true,
      iceServers: true,
      maxBitrate: 5000000,
      preferredCodec: "video/VP9",
    });
    setOpen(false);

    client.current.peerConnection.addEventListener(
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

          const headers = new Headers();
          headers.set("Content-Type", "application/json");
          if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
          fetch("/api/channels/me", {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              title,
              thumbnail: canvas.toDataURL("image/jpeg", 0.5),
            }),
          });
        } else if (this.connectionState === "failed") {
          window.alert("Cannot connect to server");
        }
      }
    );

    client.current.dataChannel!.addEventListener("message", function (ev) {
      const data = JSON.parse(ev.data);
      const { type, id, body } = data;
      if (type === "message") {
        setMessages((messages) => {
          const newMessages = [{ id, content: body }, ...messages];
          if (newMessages.length > 1000) newMessages.pop();
          return newMessages;
        });
        this.send(JSON.stringify(data));
      } else if (data.type === "views") {
        setViews(+body);
      }
    });

    client.current.dataChannel!.addEventListener("open", function () {
      this.send(
        JSON.stringify({
          type: "meta",
          id: crypto.randomUUID(),
          body: { title },
        })
      );
    });
  }

  useEffect(() => {
    return () => {
      if (client.current) {
        client.current.disconnectStream();
        client.current = null;
      }
    };
  }, []);

  async function handleStopStream() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (client.current) {
      client.current.disconnectStream();
      client.current = null;
    }
    setOpen(true);
  }

  return (
    <div className="App">
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
          backgroundColor: "black",
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
          backgroundColor: "rgba(64, 64, 64, 0.5)",
          color: "white",
        }}
      >
        {views}
      </Box>
      <IngestFooter messages={messages} onStopClick={handleStopStream} />
    </div>
  );
}

export default IngestApp;
