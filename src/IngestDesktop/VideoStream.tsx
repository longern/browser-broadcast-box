import React from "react";

const VideoStream = (
  props: React.DetailedHTMLProps<
    React.VideoHTMLAttributes<HTMLVideoElement>,
    HTMLVideoElement
  > & { stream?: MediaStream }
) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { stream, ...rest } = props;
  React.useEffect(() => {
    videoRef.current!.srcObject = stream || null;
  }, [stream]);
  return <video {...rest} ref={videoRef} />;
};

export default VideoStream;
