import { Button, Stack } from "@mui/material";
import React from "react";

import Card from "./Card";
import CreateSourceDialog from "./CreateSourceDialog";
import { useLocalStorage } from "./hooks";
import { mediaInputs } from "./mediaInputs";
import MenuBar from "./MenuBar";
import Preview from "./Preview";
import ScenesCard from "./ScenesCard";
import SettingsDialog from "./SettingsDialog";
import SourcesCard from "./SourcesCard";

export default function IngestDesktopApp() {
  const menuItems = [
    {
      label: "File",
      items: [
        {
          label: "Settings",
          onClick: () => {
            setSettingsDialogOpen(true);
          },
        },
      ],
    },
    {
      label: "Help",
      items: [
        {
          label: "View on GitHub",
          onClick: () => {
            window.open("https://github.com/longern/browser-broadcast-box");
          },
        },
      ],
    },
  ];

  const [scenes, setScenes] = React.useState([
    {
      id: crypto.randomUUID(),
      name: "Scene",
      sources: [],
    },
  ]);
  const [selectedScene, setSelectedScene] = React.useState(scenes[0]);
  const [sources, setSources] = React.useState(scenes[0].sources);
  const [selectedSource, setSelectedSource] = React.useState(null);
  const [addSourceDialogOpen, setAddSourceDialogOpen] = React.useState(false);
  const [settings, setSettings] = useLocalStorage("bbbSettings", {});
  const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false);
  const [stream, setStream] = React.useState(new MediaStream());
  const [broadcasting, setBroadcasting] = React.useState(false);

  const worker = React.useRef(null);
  const composedTrack = React.useRef(null);
  const whipClient = React.useRef(null);

  React.useEffect(() => {
    const workerUrl = new URL("./worker.js", import.meta.url);
    worker.current = new Worker(workerUrl, { type: "module" });
    if (window.MediaStreamTrackGenerator) {
      if (!composedTrack.current) {
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const frameRate = 30;
        const output = canvas.transferControlToOffscreen();
        const stream = canvas.captureStream(frameRate);
        composedTrack.current = stream.getVideoTracks()[0];
        worker.current.postMessage({ output, frameRate }, [output]);
      }

      const streams = {};
      for (const mediaInput of Object.values(mediaInputs)) {
        const track = mediaInput.getVideoTracks()[0];
        if (track) {
          const processor = new window.MediaStreamTrackProcessor({ track });
          streams[mediaInput.id] = processor.readable;
        }
      }
      worker.current.postMessage({ streams }, Object.values(streams));
    }

    return () => {
      worker.current.terminate();
      composedTrack.current = null;
    };
  }, []);

  React.useEffect(() => {
    const baseStream = (() => {
      for (const source of sources) {
        if (source.id in mediaInputs) {
          const stream = mediaInputs[source.id];
          if (stream.getVideoTracks().length > 0) {
            return stream;
          }
        }
      }
      return null;
    })();
    if (!baseStream) return;

    if (!window.MediaStreamTrackProcessor) {
      setStream(baseStream);
      return;
    }

    worker.current.postMessage({ sources });

    setStream(
      new MediaStream([composedTrack.current, ...baseStream.getAudioTracks()])
    );
  }, [sources]);

  function handleAddSource(source) {
    const { stream, ...rest } = source;

    if (stream) {
      mediaInputs[rest.id] = stream;
      if (
        window.MediaStreamTrackProcessor &&
        stream.getVideoTracks().length > 0
      ) {
        const track = stream.getVideoTracks()[0];
        const processor = new window.MediaStreamTrackProcessor({ track });
        worker.current.postMessage(
          { streams: { [rest.id]: processor.readable } },
          [processor.readable]
        );
      }
    }

    if (source.type === "image") {
      const image = new Image();
      image.src = source.src;
      image.decode().then(async () => {
        const bitmap = await createImageBitmap(image);
        const streams = { [source.src]: bitmap };
        worker.current.postMessage({ streams }, [bitmap]);
      });
    }

    const newSources = [...sources, rest];
    setSources(newSources);
    selectedScene.sources = newSources;
  }

  function handleSourceChange(source) {
    const newSources = sources.map((s) => (s.id === source.id ? source : s));
    selectedScene.sources = newSources;
    setSources(newSources);
  }

  function handleStartStreaming() {
    const { liveUrl } = settings;
    if (!liveUrl) return setSettingsDialogOpen(true);

    import("../WHIPClient").then((WHIPClientModule) => {
      const WHIPClient = WHIPClientModule.default;
      const client = new WHIPClient(liveUrl, stream);

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
          setBroadcasting(true);
          whipClient.current = client;
        }
      );
    });
  }

  function handleStopStreaming() {
    setBroadcasting(false);
    whipClient.current.disconnectStream();
    whipClient.current = null;
  }

  return (
    <div className="App" style={{ fontSize: 14, backgroundColor: "#1F212A" }}>
      <MenuBar menuItems={menuItems} />
      <Stack
        component="main"
        sx={{
          height: "100%",
          padding: 1,
          backgroundColor: "#191B26",
          overflowY: "hidden",
        }}
        justifyContent="center"
        alignItems="center"
      >
        <Preview
          sources={sources}
          previewStream={stream}
          onSourceChange={handleSourceChange}
        />
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          flexShrink: 0,
          height: 256,
          "& > *": {
            flexGrow: 1,
          },
        }}
      >
        <ScenesCard
          scenes={scenes}
          selectedScene={selectedScene}
          onScenesChange={setScenes}
          onSelectScene={(scene) => {
            setSelectedScene(scene);
            setSources(scene.sources);
          }}
        />

        <SourcesCard
          sources={sources}
          selectedSource={selectedSource}
          onSelectSource={setSelectedSource}
          onAddSourceDialogOpen={() => setAddSourceDialogOpen(true)}
          onSourcesChange={(sources) => {
            setSources(sources);
            selectedScene.sources = sources;
          }}
        ></SourcesCard>

        <CreateSourceDialog
          open={addSourceDialogOpen}
          onClose={() => {
            setAddSourceDialogOpen(false);
          }}
          onAddSource={handleAddSource}
        />

        <Card header="Controls">
          <Stack direction="column" spacing={0.5} sx={{ padding: 0.5 }}>
            {broadcasting ? (
              <Button
                variant="contained"
                color="error"
                onClick={handleStopStreaming}
              >
                Stop Streaming
              </Button>
            ) : (
              <Button variant="contained" onClick={handleStartStreaming}>
                Start Streaming
              </Button>
            )}
            <Button variant="contained">Start Recording</Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => setSettingsDialogOpen(true)}
            >
              Settings
            </Button>
            <Button variant="contained" size="small" href="/">
              Exit
            </Button>
          </Stack>
        </Card>
      </Stack>
      <SettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}
