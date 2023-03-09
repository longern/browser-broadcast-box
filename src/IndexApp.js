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

  useEffect(() => {
    (async () => {
      try {
        const channelResponse = await fetch("/api/channels");
        setLoading(false);
        if (channelResponse.status >= 299) {
          setListChannelsNotSupported(true);
          return;
        }

        const channelList = (await channelResponse.json()).channels;
        setChannels(channelList);
      } catch (e) {
        setLoading(false);
        setListChannelsNotSupported(true);
      }
    })();
  }, []);

  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar variant="dense">
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
              <span>No channels found</span>
            )}
          </Box>
        ) : (
          <Container maxWidth="lg">
            <Grid container spacing={2}>
              {channels.map((channel) => (
                <Grid item key={channel.id} xs={12} sm={6} md={4} lg={3}>
                  <Link
                    href={`?c=${channel.id}#watch`}
                    underline="none"
                    onClick={(e) => {
                      const url = e.currentTarget.href;
                      window.history.pushState({}, "", url);
                      window.dispatchEvent(new Event("hashchange"));
                      e.preventDefault();
                    }}
                  >
                    <Stack direction="column" spacing={1}>
                      <img src={channel.thumbnail} alt={channel.title} />
                      <span>{channel.title}</span>
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
