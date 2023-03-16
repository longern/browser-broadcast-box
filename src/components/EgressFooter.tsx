import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { IconButton, Stack, TextField } from "@mui/material";
import React from "react";

import Messages from "./Messages";

export default function Footer({
  onChatSend = () => {},
  onFullscreenClick = () => {},
}: {
  onChatSend?: (message: string) => void;
  onFullscreenClick?: () => void;
}) {
  function handleChatInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (!e.currentTarget.value || e.currentTarget.value.length > 100) return;
      onChatSend(e.currentTarget.value);
      e.currentTarget.value = "";
    }
  }

  return (
    <div
      className="footer"
      style={{
        position: "absolute",
        bottom: 0,
        padding: 8,
        width: "100%",
      }}
    >
      <Stack direction="column">
        <Messages></Messages>
        <Stack direction="row">
          <TextField
            id="chat-input"
            variant="outlined"
            fullWidth
            size="small"
            autoComplete="off"
            onKeyDown={handleChatInput}
          />
          <IconButton onClick={() => onFullscreenClick()}>
            <FullscreenIcon />
          </IconButton>
        </Stack>
      </Stack>
    </div>
  );
}
