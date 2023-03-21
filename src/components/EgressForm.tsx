import { Box, Button, Stack, TextField } from "@mui/material";
import { useState } from "react";

export default function EgressForm({
  onWatchStream,
}: {
  onWatchStream?: (options: { liveUrl: string }) => void;
}) {
  const [liveUrl, setLiveUrl] = useState("");

  function validate() {
    return liveUrl !== "";
  }

  return (
    <Box component="form">
      <Stack direction="column" spacing={3}>
        <TextField
          id="live-url"
          label="Live URL"
          size="small"
          onChange={(e) => setLiveUrl(e.target.value)}
        ></TextField>
        <Button
          variant="contained"
          disabled={!validate()}
          onClick={() => onWatchStream?.({ liveUrl: liveUrl })}
        >
          Watch
        </Button>
      </Stack>
    </Box>
  );
}
