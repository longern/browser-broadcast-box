import React from "react";

import { Box, Card as MuiCard, Stack } from "@mui/material";

export default function Card({
  children,
  header,
}: {
  children: React.ReactNode;
  header: string;
}) {
  return (
    <MuiCard>
      <Stack direction="column" sx={{ height: "100%" }}>
        <Box
          sx={{
            padding: "4px 8px",
            backgroundColor: "rgba(127, 127, 127, 0.5)",
            fontWeight: "bold",
            userSelect: "none",
          }}
        >
          {header}
        </Box>
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>{children}</Box>
      </Stack>
    </MuiCard>
  );
}
