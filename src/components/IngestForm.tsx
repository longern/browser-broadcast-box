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
import { useEffect, useState } from "react";

let permissionGranted = false;
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

async function requestPermission() {
  if (permissionGranted) return;
  try {
    const queryResult = await navigator.permissions.query({
      name: "camera" as PermissionName,
    });
    if (queryResult.state === "granted") {
      permissionGranted = true;
      return;
    }
  } catch (e) {}
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((track) => track.stop());
    permissionGranted = true;
  } catch (e) {}
}

export default function IngestForm({
  onDeviceChange,
  onStartStream,
}: {
  onDeviceChange?: (deviceId: string | null) => Promise<void>;
  onStartStream?: (options: {
    liveUrl: string;
    authToken?: string;
    title?: string;
  }) => void;
}) {
  const [liveUrl, setLiveUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [title, setTitle] = useState("Welcome!");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("none");

  async function init() {
    await requestPermission();

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

  async function createLiveInput() {
    const response = await fetch("/api/live_inputs", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const live_input_response = await response.json();
    if (!live_input_response.success) {
      window.alert(live_input_response.messages[0].message);
      return;
    }
    setLiveUrl(live_input_response.result.webRTC.url);
  }

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
        <Stack direction="row" spacing={1}>
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
                    aria-label="clear live url"
                    sx={{ visibility: liveUrl ? "visible" : "hidden" }}
                    onClick={() => setLiveUrl("")}
                    edge="end"
                  >
                    <CloseIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          ></TextField>
          <Button
            variant="contained"
            size="small"
            color="primary"
            disabled={!authToken}
            onClick={createLiveInput}
          >
            Create
          </Button>
        </Stack>
        {/* Hidden input username for save password */}
        <input
          type="text"
          name="username"
          hidden
          value="default"
          readOnly
          autoComplete="username"
        />
        <TextField
          id="auth-token"
          value={authToken}
          label="Auth Token"
          size="small"
          type={"password"}
          onChange={(e) => setAuthToken(e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton
                aria-label="clear auth token"
                sx={{ visibility: authToken ? "visible" : "hidden" }}
                onClick={() => setAuthToken("")}
                edge="end"
              >
                <CloseIcon />
              </IconButton>
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
                aria-label="clear title"
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
          <IconButton aria-label="refresh devices" onClick={init}>
            <RefreshIcon />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          disabled={!validate()}
          onClick={() => onStartStream?.({ liveUrl, authToken, title })}
        >
          Start
        </Button>
      </Stack>
    </Box>
  );
}
