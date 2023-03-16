import SettingsIcon from "@mui/icons-material/Settings";
import { Button, Dialog, DialogContent, IconButton } from "@mui/material";
import React, { useState } from "react";

import Messages from "./Messages.tsx";

export default function Footer({ onStopClick = () => {} }) {
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
      <Messages></Messages>
      <IconButton onClick={() => setSettingsOpen(true)}>
        <SettingsIcon />
      </IconButton>
    </div>
  );
}
