import { Box, SxProps } from "@mui/material";
import type { Message } from "../contexts/MessagesContext";

export default function Messages({
  messages,
  sx,
  messageSx,
}: {
  messages: Message[];
  sx?: SxProps;
  messageSx?: SxProps;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "flex-start",
        overflowY: "auto",
        ...sx,
      }}
    >
      {messages.map((message) => (
        <Box key={message.id} sx={{ ...messageSx }}>
          {message.content}
        </Box>
      ))}
    </Box>
  );
}
