import React, { useEffect, useState } from "react";

import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Stack,
  Toolbar,
} from "@mui/material";
import { Container } from "@mui/system";

import ChannelGrid from "./components/ChannelGrid";
import type { Channel } from "./components/ChannelGrid";

function IndexApp() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [listChannelsNotSupported, setListChannelsNotSupported] =
    useState(false);

  async function fetchChannels() {
    setLoading(true);
    try {
      const channelResponse = await fetch("/api/channels?live=1");
      if (channelResponse.status >= 299) {
        setListChannelsNotSupported(true);
        return;
      }

      const channelList = (await channelResponse.json()).channels;
      setChannels(channelList);
    } catch (e) {
      setListChannelsNotSupported(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar variant="dense" disableGutters sx={{ placeItems: "stretch" }}>
          <Button
            href="/"
            color="inherit"
            aria-label="home"
            sx={{ height: "100%" }}
          >
            <img src="/logo192.png" alt="logo" width="32" height="32" />
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button href="#ingest" color="inherit">
            Live
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main">
        {loading || listChannelsNotSupported || channels.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loading ? (
              <CircularProgress />
            ) : listChannelsNotSupported ? (
              <Stack direction="column" spacing={3}>
                <span>Channel listing is not supported</span>
                <Button variant="contained" href={`#watch`}>
                  Watch External Streams
                </Button>
              </Stack>
            ) : (
              <Stack direction="column" spacing={3} alignItems="center">
                <span>No channels found</span>
                <Button variant="contained" onClick={() => fetchChannels()}>
                  Retry
                </Button>
              </Stack>
            )}
          </Box>
        ) : (
          <Container maxWidth="lg" sx={{ p: { xs: 0 }, pt: { sm: 2 } }}>
            <ChannelGrid channels={channels} />
          </Container>
        )}
      </Box>
    </div>
  );
}

export default IndexApp;
