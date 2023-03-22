import React, { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent } from "@mui/material";
import EgressFooter from "./components/EgressFooter";
import EgressForm from "./components/EgressForm";
import VideoStream from "./IngestDesktop/VideoStream";
import {
  MessagesContext,
  SetMessagesContext,
} from "./contexts/MessagesContext";
import type { Message } from "./contexts/MessagesContext";

import WHEPClient from "./WHEPClient";

function EgressApp() {
  const [open, setOpen] = useState(true);
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);

  const client = useRef<WHEPClient | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const channel = searchParams.get("c");
    if (channel) handleWatchStream({ liveUrl: "/api/whep" });
    return () => {
      if (client.current) client.current.peerConnection.close();
    };
  }, []);

  async function handleWatchStream(options: { liveUrl: string }) {
    const { liveUrl } = options;
    client.current = new WHEPClient(liveUrl);
    client.current.peerConnection.addEventListener(
      "connectionstatechange",
      function () {
        if (this.connectionState === "failed") {
          window.alert("Cannot connect to the stream");
          setOpen(true);
        }
      }
    );
    setStream(client.current.stream);
    setOpen(false);
  }

  async function handleChatSend(message: string) {
    if (!client.current) return;
    const newMessage = { id: crypto.randomUUID(), content: message };
    client.current.dataChannel.send(JSON.stringify(newMessage));
    setMessages((messages) => [newMessage, ...messages]);
  }

  async function handleFullscreenClick() {
    await videoRef.current!.requestFullscreen();
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
          <VideoStream
            ref={videoRef}
            stream={stream}
            autoPlay
            playsInline
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              zIndex: -1,
            }}
          />
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
