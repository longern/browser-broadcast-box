import React, { useState } from "react";

import { Dialog, DialogContent } from "@mui/material";
import IngestFooter from "./components/IngestFooter";
import IngestForm from "./components/IngestForm";
import VideoStream from "./components/VideoStream";
import {
  MessagesContext,
  SetMessagesContext,
} from "./contexts/MessagesContext";
import { Box } from "@mui/system";

function IngestApp() {
  const [open, setOpen] = useState(true);
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [views, setViews] = useState(0);

  async function handleDeviceChange(deviceId) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (!deviceId) return setStream(null);

    if (deviceId === "screen") {
      const newStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          channels: 2,
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      setStream(newStream);
    } else {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId,
          width: 1920,
          height: 1080,
        },
        audio: {
          channels: 2,
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      setStream(newStream);
    }
  }

  async function handleStartStream(options) {
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
            if (sender.track.kind === "video") {
              const parameters = sender.getParameters();
              parameters.encodings[0].maxBitrate = 5000000;
              sender.setParameters(parameters);
            }
          });
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
          <VideoStream stream={stream} muted />
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
