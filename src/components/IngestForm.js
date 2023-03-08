import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import React, { useEffect, useState } from "react";

let permissionGranted = false;
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

export default function IngestForm({
  onDeviceChange = () => {},
  onStartStream = () => {},
}) {
  const [liveUrl, setLiveUrl] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("none");

  async function init() {
    if (!permissionGranted) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      permissionGranted = true;
    }

    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (device) => device.kind === "videoinput"
    );
    if (!isMobile)
      devices.push({
        kind: "videoinput",
        label: "Screen",
        deviceId: "screen",
      });

    setDevices(devices);
  }

  useEffect(() => {
    init();
  }, []);

  async function handleDeviceChange(e) {
    setSelectedDevice(e.target.value);
    await onDeviceChange(e.target.value === "none" ? null : e.target.value);
    e.preventDefault();
  }

  function validate() {
    return liveUrl !== "" && selectedDevice !== "none";
  }

  return (
    <Box component="form">
      <Stack direction="column" spacing={3}>
        <TextField
          id="live-url"
          label="Live URL"
          size="small"
          onChange={(e) => setLiveUrl(e.target.value)}
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
          onClick={() => onStartStream({ liveUrl: liveUrl })}
        >
          Start
        </Button>
      </Stack>
    </Box>
  );
}
