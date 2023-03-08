import { memo, useRef, useEffect } from "react";

const VideoStream = memo(function ({ stream, muted }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      autoPlay
      playsInline
      muted={muted}
      ref={ref}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        zIndex: -1,
      }}
    />
  );
});

export default VideoStream;
