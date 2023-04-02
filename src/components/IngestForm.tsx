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
import { useCallback, useEffect, useState } from "react";
import { Add } from "@mui/icons-material";

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

function CloudFlareStreamFormGroup({
  onLiveUrlChange,
}: {
  onLiveUrlChange: (liveUrl: string) => void;
}) {
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [verified, setVerified] = useState(false);
  const [liveInputs, setLiveInputs] = useState([] as any[]);
  const [curLiveInput, setCurLiveInput] = useState("");
  const [liveUrl, setLiveUrl] = useState("");

  const handleListLiveInputs = useCallback(
    (accountId: string, apiToken: string) => {
      if (!accountId || !apiToken) return;
      fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${apiToken}` },
          mode: "cors",
        }
      ).then(async (res) => {
        const data = await res.json();
        if (data.success) {
          setLiveInputs(data.result);
          setVerified(true);
        }
      });
    },
    []
  );

  const handleCreateLiveInput = useCallback(
    (accountId: string, apiToken: string) => {
      if (!accountId || !apiToken) return;
      fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiToken}` },
          mode: "cors",
        }
      ).then(async (res) => {
        const data = await res.json();
        if (data.success) {
          setLiveInputs((liveInputs) => [...liveInputs, data.result]);
          setCurLiveInput(data.result.uid);
        }
      });
    },
    []
  );

  useEffect(() => {
    if (!curLiveInput) return;
    fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs/${curLiveInput}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiToken}` },
        mode: "cors",
      }
    ).then(async (res) => {
      const data = await res.json();
      if (data.success) {
        setLiveUrl(data.result.webRTC.url);
      }
    });
  }, [accountId, apiToken, curLiveInput]);

  useEffect(() => {
    onLiveUrlChange(liveUrl);
  }, [liveUrl, onLiveUrlChange]);

  return verified ? (
    <>
      <Stack direction="row" spacing={1}>
        <FormControl fullWidth size="small">
          <InputLabel id="live-input-label">Live Input</InputLabel>
          <Select
            label="Live Input"
            value={curLiveInput}
            fullWidth
            onChange={(e: SelectChangeEvent) => {
              setCurLiveInput(e.target.value);
            }}
          >
            {!liveInputs.length && (
              <MenuItem disabled value="">
                <em>No live inputs</em>
              </MenuItem>
            )}
            {liveInputs.map((liveInput) => (
              <MenuItem key={liveInput.uid} value={liveInput.uid}>
                {liveInput.meta.name ?? liveInput.uid}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          aria-label="add live input"
          size="small"
          onClick={() => handleCreateLiveInput(accountId, apiToken)}
        >
          <Add />
        </IconButton>
      </Stack>
      <TextField
        label="Live URL"
        value={liveUrl}
        size="small"
        disabled
      ></TextField>
    </>
  ) : (
    <>
      <TextField
        label="Account ID"
        value={accountId}
        size="small"
        fullWidth
        autoComplete="username"
        onChange={(e) => setAccountId(e.target.value)}
      />
      <TextField
        label="API Token"
        value={apiToken}
        type="password"
        size="small"
        fullWidth
        onChange={(e) => setApiToken(e.target.value)}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        disabled={!accountId || !apiToken}
        onClick={() => handleListLiveInputs(accountId, apiToken)}
      >
        Connect
      </Button>
    </>
  );
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
  const [service, setService] = useState("my_channel");
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
    const response = await fetch("/api/channels/me/live_input", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ meta: { name: title } }),
    });
    if (response.status === 409) {
      const live_input_response = await fetch("/api/channels/me/live_input", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const live_input_body = await live_input_response.json();
      setLiveUrl(live_input_body.result.webRTC.url);
      return;
    }
    const live_input_body = await response.json();
    if (!live_input_body.success) {
      window.alert(live_input_body.messages[0].message);
      return;
    }
    setLiveUrl(live_input_body.result.webRTC.url);
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
        <FormControl fullWidth>
          <InputLabel id="service-label">Service</InputLabel>
          <Select
            id="service"
            label="Service"
            value={service}
            size="small"
            onChange={(e) => setService(e.target.value)}
          >
            <MenuItem value="my_channel">My Channel</MenuItem>
            <MenuItem value="cf_stream">CloudFlare Stream</MenuItem>
            <MenuItem value="whip">WHIP Endpoint</MenuItem>
          </Select>
        </FormControl>
        {service === "my_channel" ? (
          <>
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
          </>
        ) : service === "cf_stream" ? (
          <CloudFlareStreamFormGroup onLiveUrlChange={setLiveUrl} />
        ) : (
          <></>
        )}
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
