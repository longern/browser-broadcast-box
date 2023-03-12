import React, { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent } from "@mui/material";
import EgressFooter from "./components/EgressFooter";
import EgressForm from "./components/EgressForm";
import VideoStream from "./components/VideoStream";
import {
  MessagesContext,
  SetMessagesContext,
} from "./contexts/MessagesContext";

function EgressApp() {
  const [open, setOpen] = useState(true);
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);

  const client = useRef(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const channel = searchParams.get("c");
    if (channel) handleWatchStream({ liveUrl: "/api/whep" });
    return () => {
      if (client.current) client.current.peerConnection.close();
    };
  }, []);

  async function handleWatchStream(options) {
    const { liveUrl } = options;
    import("./WHEPClient").then((WHEPClientModule) => {
      const WHEPClient = WHEPClientModule.default;
      if (client.current) client.current.peerConnection.close();
      client.current = new WHEPClient(liveUrl);
      client.current.peerConnection.addEventListener(
        "connectionstatechange",
        (ev) => {
          if (ev.target.connectionState === "failed") {
            window.alert("Cannot connect to the stream");
            setOpen(true);
          }
        }
      );
      setStream(client.current.stream);
    });
    setOpen(false);
  }

  async function handleChatSend(message) {
    client.current.dataChannel.send(
      JSON.stringify({ id: crypto.randomUUID(), message })
    );
  }

  async function handleFullscreenClick() {
    const video = document.querySelector("video");
    await video.requestFullscreen();
  }

  return (
    <div className="App">
      <MessagesContext.Provider value={messages}>
        <SetMessagesContext.Provider value={setMessages}>
          <Dialog open={open} fullWidth>
            <DialogContent>
              <EgressForm onWatchStream={handleWatchStream} />
            </DialogContent>
          </Dialog>
          <VideoStream stream={stream} />
          <EgressFooter
            onChatSend={handleChatSend}
            onFullscreenClick={handleFullscreenClick}
          />
        </SetMessagesContext.Provider>
      </MessagesContext.Provider>
    </div>
  );
}

export default EgressApp;
