import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import React from "react";

export default function SettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
}: {
  open: boolean;
  onClose: () => void;
  settings: Record<string, any>;
  onSettingsChange: (settings: Record<string, any>) => void;
}) {
  const allTabs = ["General", "Stream", "Output"] as const;
  const [currentTab, setCurrentTab] = React.useState(
    "General" as typeof allTabs[number]
  );
  const [tempSettings, setTempSettings] = React.useState(settings);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1}>
          <List sx={{ width: { sm: 180 } }}>
            {allTabs.map((tab) => (
              <ListItem key={tab} disablePadding>
                <ListItemButton
                  selected={tab === currentTab}
                  onClick={() => setCurrentTab(tab)}
                >
                  {tab}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Stack spacing={2} sx={{ flexGrow: 1, p: 1 }}>
            {currentTab === "General" ? (
              <FormControl>
                <InputLabel id="language-label">Language</InputLabel>
                <Select
                  labelId="language-label"
                  label="Language"
                  value={tempSettings.language || "en"}
                  size="small"
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      language: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            ) : currentTab === "Stream" ? (
              <>
                <TextField
                  label="Live URL"
                  value={tempSettings.liveUrl || ""}
                  required
                  size="small"
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      liveUrl: e.target.value,
                    })
                  }
                  fullWidth
                ></TextField>
                <TextField
                  label="Auth Token"
                  value={tempSettings.authToken || ""}
                  size="small"
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      authToken: e.target.value,
                    })
                  }
                  fullWidth
                ></TextField>
              </>
            ) : currentTab === "Output" ? (
              <>
                <TextField
                  label="Bitrate"
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">Kbps</InputAdornment>
                    ),
                  }}
                  value={
                    tempSettings.bitrate === undefined
                      ? "2500"
                      : tempSettings.bitrate
                  }
                  size="small"
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      bitrate: e.target.value,
                    })
                  }
                  fullWidth
                ></TextField>
                <FormControl>
                  <InputLabel id="encoder-label">Encoder</InputLabel>
                  <Select
                    labelId="encoder-label"
                    label="Encoder"
                    value={tempSettings.encoder || "video/VP9"}
                    size="small"
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        encoder: e.target.value,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="video/H264">H264</MenuItem>
                    <MenuItem value="video/VP8">VP8</MenuItem>
                    <MenuItem value="video/VP9">VP9</MenuItem>
                  </Select>
                </FormControl>
              </>
            ) : null}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onSettingsChange(tempSettings);
            onClose();
          }}
        >
          Save
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
