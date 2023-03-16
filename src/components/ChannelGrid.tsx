import React from "react";
import { Box, Grid, Link, Stack } from "@mui/material";

export type Channel = {
  id: string;
  title: string;
  thumbnail: string;
};

export default function ChannelGrid({ channels }: { channels: Channel[] }) {
  return (
    <Grid container spacing={2}>
      {channels.map((channel) => (
        <Grid item key={channel.id} xs={12} sm={6} md={4} lg={3}>
          <Link
            href={`?c=${channel.id}#watch`}
            color="inherit"
            underline="none"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
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
  );
}
