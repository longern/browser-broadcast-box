import React, { useEffect, useRef, useState } from "react";

import { ArrowBack, Fullscreen, Send } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Theme,
  Toolbar,
  useMediaQuery,
} from "@mui/material";
import EgressForm from "./components/EgressForm";
import VideoStream from "./IngestDesktop/VideoStream";
import type { Message } from "./components/Messages";

import WHEPClient from "./WHEPClient";
import Messages from "./components/Messages";

function EgressDesktop({
  stream,
  messages,
  handleChatInput,
}: {
  stream: MediaStream | undefined;
  messages: Message[];
  handleChatInput: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <Stack direction="row" sx={{ height: "100%" }}>
      <VideoStream
        ref={videoRef}
        stream={stream}
        autoPlay
        playsInline
        style={{
          flexGrow: 1,
          minWidth: 0,
          height: "100%",
          aspectRatio: "16/9",
          background: "black",
          objectFit: "contain",
        }}
      />
      <Stack
        spacing={1}
        sx={{
          flexShrink: 0,
          p: 1,
          width: 360,
          justifyContent: "space-between",
        }}
      >
        <Messages messages={messages}></Messages>
        <TextField
          id="chat-input"
          label="Chat"
          variant="outlined"
          fullWidth
          size="small"
          autoComplete="off"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton aria-label="send" edge="end">
                  <Send />
                </IconButton>
              </InputAdornment>
            ),
          }}
          onKeyDown={handleChatInput}
        />
      </Stack>
    </Stack>
  );
}

function EgressMobileLandscapeStream({
  stream,
  messages,
  handleChatInput,
}: {
  stream: MediaStream | undefined;
  messages: Message[];
  handleChatInput: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <>
      <AppBar position="static">
        <Toolbar variant="dense" disableGutters>
          <IconButton aria-label="back" href="/" size="large">
            <ArrowBack />
          </IconButton>
        </Toolbar>
      </AppBar>
      <VideoStream
        ref={videoRef}
        stream={stream}
        autoPlay
        playsInline
        style={{
          width: "100%",
          background: "black",
        }}
      />
      <Stack
        spacing={1}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          p: 1,
          justifyContent: "space-between",
        }}
      >
        <Messages messages={messages}></Messages>
        <Stack direction="row">
          <TextField
            id="chat-input"
            variant="outlined"
            fullWidth
            size="small"
            autoComplete="off"
            onKeyDown={handleChatInput}
          />
          <IconButton onClick={() => videoRef.current!.requestFullscreen()}>
            <Fullscreen />
          </IconButton>
        </Stack>
      </Stack>
    </>
  );
}

function EgressMobilePortraitStream({
  stream,
  messages,
  handleChatInput,
}: {
  stream: MediaStream | undefined;
  messages: Message[];
  handleChatInput: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <>
      <VideoStream
        ref={videoRef}
        stream={stream}
        autoPlay
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "black",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      >
        <IconButton
          aria-label="back"
          href="/"
          size="large"
          sx={{ position: "absolute", top: 0, left: 0 }}
        >
          <ArrowBack />
        </IconButton>
        <Stack
          sx={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            p: 1,
            justifyContent: "space-between",
          }}
        >
          <Messages
            messages={messages}
            sx={{ maxHeight: "50vh" }}
            messageSx={{
              backgroundColor: "rgba(127, 127, 127, 0.5)",
              borderRadius: "16px",
              padding: "0.5em 0.8em",
              marginBottom: "0.5em",
              fontSize: "0.8em",
            }}
          ></Messages>
          <Stack direction="row">
            <TextField
              id="chat-input"
              variant="outlined"
              fullWidth
              size="small"
              autoComplete="off"
              onKeyDown={handleChatInput}
            />
            <IconButton onClick={() => videoRef.current!.requestFullscreen()}>
              <Fullscreen />
            </IconButton>
          </Stack>
        </Stack>
      </Box>
    </>
  );
}

function EgressApp() {
  const [dialogOpen, setDialogOpen] = useState(true);
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [videoSize, setVideoSize] = useState({ width: 1920, height: 1080 });
  const mediaQuery = useMediaQuery((theme: Theme) =>
    theme.breakpoints.up("sm")
  );

  const client = useRef<WHEPClient | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const channel = searchParams.get("c");
    if (channel) handleWatchStream({ liveUrl: "/api/whep" });
    return () => {
      if (client.current) client.current.peerConnection.close();
    };
  }, []);

  useEffect(() => {
    if (!stream) return;
    const videoElement = document.createElement("video");
    videoElement.muted = true;
    videoElement.srcObject = stream;
    videoElement.addEventListener("loadedmetadata", function handleLoaded() {
      setVideoSize({
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      });
      videoElement.removeEventListener("loadedmetadata", handleLoaded);
    });
  }, [stream]);

  async function handleWatchStream(options: { liveUrl: string }) {
    const { liveUrl } = options;
    client.current = new WHEPClient(liveUrl);
    client.current.peerConnection.addEventListener(
      "connectionstatechange",
      function () {
        if (this.connectionState === "failed") {
          window.alert("Cannot connect to the stream");
          setDialogOpen(true);
        }
      }
    );
    setStream(client.current.stream);

    setDialogOpen(false);
  }

  async function handleChatSend(message: string) {
    if (!client.current) return;
    const newMessage = { id: crypto.randomUUID(), content: message };
    client.current.dataChannel.send(JSON.stringify(newMessage));
    setMessages((messages) => [newMessage, ...messages]);
  }

  function handleChatInput(e: React.KeyboardEvent<HTMLInputElement>) {
    const target = e.target as HTMLInputElement;
    if (e.key === "Enter") {
      if (!target.value || target.value.length > 100) return;
      handleChatSend(target.value);
      target.value = "";
    }
  }

  return (
    <div className="App">
      <Dialog open={dialogOpen} fullWidth>
        <DialogContent>
          <EgressForm onWatchStream={handleWatchStream} />
        </DialogContent>
      </Dialog>
      {mediaQuery ? (
        <EgressDesktop
          stream={stream}
          messages={messages}
          handleChatInput={handleChatInput}
        />
      ) : videoSize.width < videoSize.height ? (
        <EgressMobilePortraitStream
          stream={stream}
          messages={messages}
          handleChatInput={handleChatInput}
        />
      ) : (
        <EgressMobileLandscapeStream
          stream={stream}
          messages={messages}
          handleChatInput={handleChatInput}
        />
      )}
    </div>
  );
}

export default EgressApp;
