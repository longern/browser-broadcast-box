import SettingsIcon from "@mui/icons-material/Settings";
import StopIcon from "@mui/icons-material/Stop";
import { Dialog, DialogContent, IconButton } from "@mui/material";
import React, { useState } from "react";

import Messages from "./Messages";

export default function Footer({ onStopClick = () => {} }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className="footer"
      style={{ position: "absolute", bottom: 0, padding: 8 }}
    >
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogContent>
          <IconButton onClick={onStopClick}>
            <StopIcon />
          </IconButton>
        </DialogContent>
      </Dialog>
      <Messages></Messages>
      <IconButton onClick={() => setSettingsOpen(true)}>
        <SettingsIcon />
      </IconButton>
    </div>
  );
}
