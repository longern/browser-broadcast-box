import React, { useState, useRef } from "react";

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

  async function handleWatchStream(options) {
    const { liveUrl } = options;
    import("./WHEPClient").then((WHEPClientModule) => {
      const WHEPClient = WHEPClientModule.default;
      client.current = new WHEPClient(liveUrl);
      setStream(client.current.stream);
    });
    setOpen(false);
  }

  async function handleChatSend(message) {
    client.current.dataChannel.send(
      JSON.stringify({ id: crypto.randomUUID(), message })
    );
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
          <EgressFooter onChatSend={handleChatSend} />
        </SetMessagesContext.Provider>
      </MessagesContext.Provider>
    </div>
  );
}

export default EgressApp;
