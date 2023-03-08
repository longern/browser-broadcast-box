import React, { useState } from "react";

import { Dialog, DialogContent } from "@mui/material";
import IngestFooter from "./components/IngestFooter";
import IngestForm from "./components/IngestForm";
import VideoStream from "./components/VideoStream";
import {
  MessagesContext,
  SetMessagesContext,
} from "./contexts/MessagesContext";

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
        audio: true,
      });
      setStream(newStream);
    } else {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId,
          width: 1920,
          height: 1080,
        },
        audio: true,
      });
      setStream(newStream);
    }
  }

  async function handleStartStream(options) {
    const { liveUrl } = options;
    import("./WHIPClient").then((WHIPClientModule) => {
      const WHIPClient = WHIPClientModule.default;
      const client = new WHIPClient(liveUrl, stream);
      client.dataChannel.addEventListener("message", (ev) => {
        const data = JSON.parse(ev.data);
        const { type, id, body } = data;
        if (type === "message") {
          const newMessages = [...messages];
          newMessages.push({ id, content: body });
          if (newMessages.length > 1000) newMessages.shift();
          setMessages(newMessages);
        } else if (data.type === "views") {
          setViews(+body);
        }
      });
    });
    setOpen(false);
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
          <IngestFooter />
        </SetMessagesContext.Provider>
      </MessagesContext.Provider>
    </div>
  );
}

export default IngestApp;
