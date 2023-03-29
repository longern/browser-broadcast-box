import React, { useEffect, useRef, useState } from "react";

import { ArrowBack, MoreVert, Send, Share } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  SwipeableDrawer,
  TextField,
  Theme,
  Toolbar,
  useMediaQuery,
} from "@mui/material";

import VideoStream from "./IngestDesktop/VideoStream";
import WHEPClient from "./WHEPClient";
import EgressForm from "./components/EgressForm";
import type { Message } from "./components/Messages";
import Messages from "./components/Messages";
import VideoOverlay from "./components/VideoOverlay";
import VideoControls from "./components/VideoControls";

function VideoContainer({
  stream,
  style,
}: {
  stream?: MediaStream;
  style?: React.CSSProperties;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoOverlayRef = useRef<HTMLDivElement>(null);

  function handleFullscreenChange(fullscreen: boolean) {
    if (fullscreen && !document.fullscreenElement) {
      videoOverlayRef.current!.requestFullscreen().then(() => {
        setFullscreen(true);
        const isVideoLandscape =
          videoRef.current!.videoWidth > videoRef.current!.videoHeight;
        if (isVideoLandscape) window.screen.orientation.lock("landscape");
      });
    } else if (!fullscreen && document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setFullscreen(false);
        window.screen.orientation.unlock();
      });
    }
  }

  useEffect(() => {
    const play = () => setPaused(false);
    const pause = () => setPaused(true);
    const volumechange = () => setMuted(Boolean(videoRef.current?.muted));
    function handleFullscreen() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    const video = videoRef.current!;
    video.addEventListener("play", play);
    video.addEventListener("pause", pause);
    video.addEventListener("volumechange", volumechange);
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => {
      video.removeEventListener("play", play);
      video.removeEventListener("pause", pause);
      video.removeEventListener("volumechange", volumechange);
      document.removeEventListener("fullscreenchange", handleFullscreen);
    };
  }, []);

  return (
    <VideoOverlay
      ref={videoOverlayRef}
      videoComponent={
        <VideoStream
          ref={videoRef}
          stream={stream}
          autoPlay
          playsInline
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            backgroundColor: "black",
            objectFit: "contain",
          }}
        />
      }
      style={{ ...style, position: "relative" }}
    >
      <VideoControls
        videoRef={videoRef}
        paused={paused}
        muted={muted}
        fullscreen={fullscreen}
        onFullscreenChange={handleFullscreenChange}
      />
    </VideoOverlay>
  );
}

function EgressDesktop({
  stream,
  messages,
  handleChatInput,
}: {
  stream: MediaStream | undefined;
  messages: Message[];
  handleChatInput: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <Stack direction="row" sx={{ height: "100%" }}>
      <VideoContainer stream={stream} />
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <AppBar position="static">
        <Toolbar variant="dense" disableGutters>
          <IconButton aria-label="back" href="/" size="large">
            <ArrowBack />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            aria-label="menu"
            size="large"
            aria-haspopup="true"
            onClick={() => setMenuOpen(true)}
          >
            <MoreVert />
          </IconButton>
          <SwipeableDrawer
            anchor="bottom"
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onOpen={() => setMenuOpen(true)}
            // Border radius top
            sx={{ "& .MuiDrawer-paper": { borderRadius: "16px 16px 0 0" } }}
          >
            <Grid>
              <Grid item>
                <IconButton aria-label="share" size="large">
                  <Share />
                </IconButton>
              </Grid>
            </Grid>
          </SwipeableDrawer>
        </Toolbar>
      </AppBar>
      <Box sx={{ aspectRatio: "16/9" }}>
        <VideoContainer stream={stream} />
      </Box>
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
    videoElement.addEventListener(
      "loadedmetadata",
      () => {
        setVideoSize({
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
        });
      },
      { once: true }
    );
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

  const mediaQuery = useMediaQuery((theme: Theme) =>
    theme.breakpoints.up("sm")
  );
  const Layout = mediaQuery
    ? EgressDesktop
    : videoSize.width < videoSize.height
    ? EgressMobilePortraitStream
    : EgressMobileLandscapeStream;

  return (
    <div className="App">
      <Dialog open={dialogOpen} fullWidth>
        <DialogContent>
          <EgressForm onWatchStream={handleWatchStream} />
        </DialogContent>
      </Dialog>
      <Layout
        stream={stream}
        messages={messages}
        handleChatInput={handleChatInput}
      />
    </div>
  );
}

export default EgressApp;
