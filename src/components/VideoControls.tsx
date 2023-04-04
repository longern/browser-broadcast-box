import { Box, IconButton, Stack } from "@mui/material";
import {
  Fullscreen,
  FullscreenExit,
  Pause,
  PlayArrow,
  VolumeOff,
  VolumeUp,
} from "@mui/icons-material";

export default function VideoControls({
  videoRef,
  paused,
  muted,
  fullscreen,
  onFullscreenChange,
}: {
  videoRef?: React.RefObject<HTMLVideoElement> | null;
  paused: boolean;
  muted: boolean;
  fullscreen: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        p: 1,
        zIndex: 1,
      }}
    >
      {paused ? (
        <IconButton
          aria-label="pause"
          onClick={() => {
            videoRef?.current?.pause();
          }}
        >
          <Pause />
        </IconButton>
      ) : (
        <IconButton
          aria-label="play"
          onClick={() => {
            videoRef?.current?.play();
          }}
        >
          <PlayArrow />
        </IconButton>
      )}
      <Box sx={{ flexGrow: 1 }} />
      {muted ? (
        <IconButton
          aria-label="unmute"
          onClick={() => {
            if (videoRef?.current) videoRef.current.muted = false;
          }}
        >
          <VolumeOff />
        </IconButton>
      ) : (
        <IconButton
          aria-label="mute"
          onClick={() => {
            if (videoRef?.current) videoRef.current.muted = true;
          }}
        >
          <VolumeUp />
        </IconButton>
      )}
      {fullscreen ? (
        <IconButton
          aria-label="exit fullscreen"
          onClick={() => {
            if (onFullscreenChange) onFullscreenChange(false);
            else document.exitFullscreen();
          }}
        >
          <FullscreenExit />
        </IconButton>
      ) : (
        <IconButton
          aria-label="fullscreen"
          onClick={() => {
            if (onFullscreenChange) onFullscreenChange(true);
            else videoRef?.current?.requestFullscreen();
          }}
        >
          <Fullscreen />
        </IconButton>
      )}
    </Stack>
  );
}
