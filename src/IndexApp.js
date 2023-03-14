import React, { useEffect, useState } from "react";

import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Grid,
  Link,
  Stack,
  Toolbar,
} from "@mui/material";
import { Container } from "@mui/system";

function IndexApp() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [listChannelsNotSupported, setListChannelsNotSupported] =
    useState(false);

  async function fetchChannels() {
    setLoading(true);
    try {
      const channelResponse = await fetch("/api/channels");
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
          <Box sx={{ flexGrow: 1 }} />
          <Button href="#ingest">Live</Button>
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
            <Grid container spacing={2}>
              {channels.map((channel) => (
                <Grid item key={channel.id} xs={12} sm={6} md={4} lg={3}>
                  <Link
                    href={`?c=${channel.id}#watch`}
                    color="inherit"
                    underline="none"
                    onClick={(e) => {
                      const url = e.currentTarget.href;
                      window.history.pushState({}, "", url);
                      window.dispatchEvent(new Event("hashchange"));
                      e.preventDefault();
                    }}
                  >
                    <Stack direction="column" spacing={1}>
                      <img
                        src={channel.thumbnail}
                        alt={channel.title}
                        style={{ aspectRatio: 640 / 360, objectFit: "contain" }}
                      />
                      <Box
                        component={"span"}
                        sx={{
                          px: 1,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {channel.title}
                      </Box>
                    </Stack>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </Container>
        )}
      </Box>
    </div>
  );
}

export default IndexApp;
