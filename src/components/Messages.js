import React, { useContext } from "react";

import { MessagesContext } from "../contexts/MessagesContext";
import { Box } from "@mui/material";

export default function Messages() {
  const messages = useContext(MessagesContext);
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "flex-start",
        maxHeight: "50vh",
        overflowY: "auto",
      }}
    >
      {messages.reverse().map((message) => (
        <Box
          key={message.id}
          sx={{
            backgroundColor: "rgba(128, 128, 128, 0.5)",
            borderRadius: "14px",
            padding: "0.5em 0.8em",
            marginBottom: "0.5em",
            fontSize: "0.8em",
          }}
        >
          {message.content}
        </Box>
      ))}
    </Box>
  );
}
