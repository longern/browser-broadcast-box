import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import React, { useEffect, useState } from "react";

let permissionGranted = false;
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

export default function IngestForm({
  onDeviceChange,
  onStartStream,
}: {
  onDeviceChange?: (deviceId: string | null) => Promise<void>;
  onStartStream?: (options: { liveUrl: string; title: string }) => void;
}) {
  const [liveUrl, setLiveUrl] = useState("");
  const [title, setTitle] = useState("Welcome!");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("none");

  async function init() {
    if (!permissionGranted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        permissionGranted = true;
      } catch (e) {}
    }

    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (device) => device.kind === "videoinput"
    );
    if (!isMobile)
      devices.push({
        kind: "videoinput",
        label: "Screen",
        deviceId: "screen",
      } as MediaDeviceInfo);

    setDevices(devices);
  }

  useEffect(() => {
    init();
  }, []);

  async function handleDeviceChange(e: SelectChangeEvent) {
    if (onDeviceChange)
      await onDeviceChange(e.target.value === "none" ? null : e.target.value);
    setSelectedDevice(e.target.value);
    e.preventDefault();
  }

  function validate() {
    return liveUrl !== "" && title && selectedDevice !== "none";
  }

  return (
    <Box component="form">
      <Stack direction="column" spacing={3}>
        <TextField
          id="live-url"
          value={liveUrl}
          label="Live URL"
          size="small"
          required
          onChange={(e) => setLiveUrl(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  sx={{ visibility: liveUrl ? "visible" : "hidden" }}
                  onClick={() => setLiveUrl("")}
                >
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        ></TextField>
        <TextField
          id="title"
          value={title}
          label="Title"
          size="small"
          required
          onChange={(e) => setTitle(e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton
                sx={{ visibility: title ? "visible" : "hidden" }}
                onClick={() => setTitle("")}
                edge="end"
              >
                <CloseIcon />
              </IconButton>
            ),
          }}
        ></TextField>
        <Stack direction="row" spacing={1}>
          <FormControl fullWidth>
            <InputLabel id="stream-device-label">Stream Device</InputLabel>
            <Select
              id="stream-device"
              label="Stream Device"
              labelId="stream-device-label"
              size="small"
              fullWidth
              value={selectedDevice}
              onChange={handleDeviceChange}
            >
              <MenuItem value="none">None</MenuItem>
              {devices.map((device) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton onClick={init}>
            <RefreshIcon />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          disabled={!validate()}
          onClick={() => onStartStream?.({ liveUrl, title })}
        >
          Start
        </Button>
      </Stack>
    </Box>
  );
}
