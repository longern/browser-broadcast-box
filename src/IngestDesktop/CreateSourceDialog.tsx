import React from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Stack,
  Select,
  Skeleton,
  MenuItem,
  TextField,
} from "@mui/material";

function TextSource({ onChange }: { onChange: (source: any) => void }) {
  const [content, setContent] = React.useState("");
  const [fontSize, setFontSize] = React.useState(128);

  React.useEffect(() => {
    if (!content) return;
    onChange({
      type: "text",
      name: "Text",
      content,
      fontSize,
      color: "#ffffff",
      x: 0,
      y: 0,
    });
  }, [content, fontSize, onChange]);

  return (
    <>
      <TextField
        label="Content"
        size="small"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <TextField
        label="Font Size"
        size="small"
        value={fontSize}
        onChange={(e) => setFontSize(parseInt(e.target.value))}
      />
    </>
  );
}

function ImageSource({ onChange }: { onChange: (source: any) => void }) {
  const [image, setImage] = React.useState("");

  function handleSelectImage(ev: React.ChangeEvent<HTMLInputElement>) {
    if (!ev.target.files) return;
    const file = ev.target.files[0];
    const objectUrl = URL.createObjectURL(file);
    setImage(objectUrl);
    ev.target.value = "";

    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      onChange({
        type: "image",
        name: "Image",
        src: objectUrl,
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
    };
  }

  return (
    <>
      <Stack alignItems={"center"}>
        {image ? (
          <img
            src={image}
            width="192"
            height="192"
            alt=""
            style={{ objectFit: "contain" }}
          />
        ) : (
          <Skeleton
            variant="rectangular"
            animation={false}
            width={192}
            height={192}
          />
        )}
      </Stack>
      <Button variant="contained" component="label">
        Select Image
        <input
          hidden
          accept="image/*"
          type="file"
          onChange={handleSelectImage}
        />
      </Button>
    </>
  );
}

function ScreenSource({ onChange }: { onChange: (source: any) => void }) {
  const [active, setActive] = React.useState(false);

  const stream = React.useRef<MediaStream | null>(null);
  const lock = React.useRef(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const getStream = React.useCallback(async () => {
    if (stream.current) return;
    if (lock.current) return;
    setActive(false);
    lock.current = true;
    try {
      const newStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as MediaTrackConstraints,
        audio: true,
      });
      stream.current = newStream;
      videoRef.current!.srcObject = newStream;
      setActive(true);
      onChange({
        type: "screen",
        name: "Screen",
        id: newStream.id,
        stream: newStream,
        x: 0,
        y: 0,
      });
    } finally {
      lock.current = false;
    }
  }, [onChange]);

  function stopStream() {
    if (!stream.current) return;
    stream.current.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setActive(false);
    onChange(null);
  }

  return (
    <>
      <Stack alignItems={"center"}>
        <video
          autoPlay
          muted
          width="240"
          height="135"
          ref={videoRef}
          style={{
            background: "black",
          }}
        ></video>
      </Stack>
      {active ? (
        <Button variant="contained" color="error" onClick={stopStream}>
          Stop
        </Button>
      ) : (
        <Button variant="contained" onClick={getStream}>
          Activate
        </Button>
      )}
    </>
  );
}

function CameraSource({ onChange }: { onChange: (source: any) => void }) {
  const [active, setActive] = React.useState(false);

  const stream = React.useRef<MediaStream | null>(null);
  const lock = React.useRef(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const getStream = React.useCallback(async () => {
    if (stream.current) return;
    if (lock.current) return;
    setActive(false);
    lock.current = true;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
        audio: {
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      stream.current = newStream;
      videoRef.current!.srcObject = newStream;
      setActive(true);
      onChange({
        type: "camera",
        name: "Camera",
        id: newStream.id,
        stream: newStream,
        x: 0,
        y: 0,
      });
    } finally {
      lock.current = false;
    }
  }, [onChange]);

  function stopStream() {
    if (!stream.current) return;
    stream.current.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setActive(false);
    onChange(null);
  }

  return (
    <>
      <Stack alignItems={"center"}>
        <video
          autoPlay
          muted
          width="240"
          height="135"
          ref={videoRef}
          style={{
            background: "black",
          }}
        ></video>
      </Stack>
      {active ? (
        <Button variant="contained" color="error" onClick={stopStream}>
          Stop
        </Button>
      ) : (
        <Button variant="contained" onClick={getStream}>
          Activate
        </Button>
      )}
    </>
  );
}

export default function CreateSourceDialog({
  open,
  onClose,
  onAddSource,
}: {
  open: boolean;
  onClose: () => void;
  onAddSource: (source: any) => void;
}) {
  const [type, setType] = React.useState("text");
  const [source, setSource] = React.useState<
    (Record<string, any> & { stream?: MediaStream }) | null
  >(null);

  function handleSourceChange(newSource: any) {
    if (newSource && !newSource.id) newSource.id = crypto.randomUUID();
    if (source?.stream)
      source.stream.getTracks().forEach((track) => track.stop());
    setSource(newSource);
  }

  function handleCreate() {
    if (!open) return;
    onAddSource(source);
    onClose();
    setType("text");
    setSource(null);
  }

  function handleClose() {
    if (source?.stream)
      source.stream.getTracks().forEach((track) => track.stop());
    onClose();
    setSource(null);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create Source</DialogTitle>
      <DialogContent>
        <Stack direction="column" spacing={2}>
          <FormControl sx={{ mt: 1 }}>
            <InputLabel id="type-label">Type</InputLabel>
            <Select
              labelId="type-label"
              id="type"
              label="Type"
              value={type}
              size="small"
              onChange={(e) => {
                setType(e.target.value);
                handleSourceChange(null);
              }}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="image">Image</MenuItem>
              <MenuItem value="screen">Screen</MenuItem>
              <MenuItem value="camera">Camera</MenuItem>
            </Select>
          </FormControl>
          {type === "text" ? (
            <TextSource onChange={handleSourceChange} />
          ) : type === "image" ? (
            <ImageSource onChange={handleSourceChange} />
          ) : type === "screen" ? (
            <ScreenSource onChange={handleSourceChange} />
          ) : type === "camera" ? (
            <CameraSource onChange={handleSourceChange} />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCreate} disabled={!source}>
          Create
        </Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
