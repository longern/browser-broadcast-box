import React from "react";

const VideoStream = React.forwardRef(
  (
    props: React.DetailedHTMLProps<
      React.VideoHTMLAttributes<HTMLVideoElement>,
      HTMLVideoElement
    > & { stream?: MediaStream },
    ref: React.Ref<HTMLVideoElement>
  ) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    React.useImperativeHandle(ref, () => videoRef.current!);
    const { stream, ...rest } = props;
    React.useEffect(() => {
      videoRef.current!.srcObject = stream || null;
    }, [stream]);
    return <video {...rest} ref={videoRef} />;
  }
);

export default VideoStream;
