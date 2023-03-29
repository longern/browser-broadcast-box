import SettingsIcon from "@mui/icons-material/Settings";
import { Button, Dialog, DialogContent, IconButton } from "@mui/material";
import { useState } from "react";

import Messages from "./Messages";
import type { Message } from "./Messages";

export default function Footer({
  messages,
  onStopClick = () => {},
}: {
  messages: Message[];
  onStopClick?: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className="footer"
      style={{ position: "absolute", bottom: 0, padding: 8, width: "100%" }}
    >
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogContent>
          <Button variant="contained" onClick={onStopClick} color="error">
            Stop
          </Button>
        </DialogContent>
      </Dialog>
      <Messages
        messages={messages}
        messageSx={{
          backgroundColor: "rgba(128, 128, 128, 0.5)",
          borderRadius: "16px",
          padding: "0.5em 0.8em",
          marginBottom: "0.5em",
          fontSize: "0.8em",
        }}
      ></Messages>
      <IconButton aria-label="settings" onClick={() => setSettingsOpen(true)}>
        <SettingsIcon />
      </IconButton>
    </div>
  );
}
