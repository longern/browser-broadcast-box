import { forwardRef, useState } from "react";

const VideoOverlay = forwardRef(
  (
    {
      children,
      defaultShowControls,
      videoComponent,
      style,
    }: {
      children: React.ReactNode;
      defaultShowControls?: boolean;
      videoComponent: React.ReactNode;
      style?: React.CSSProperties;
    },
    ref: React.Ref<HTMLDivElement>
  ) => {
    const [showControls, setShowControls] = useState(
      defaultShowControls || false
    );
    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          ...style,
        }}
      >
        {videoComponent}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            backgroundImage: showControls
              ? "linear-gradient(to top, black, transparent 48px)"
              : "none",
          }}
          onClick={(ev) => {
            if (ev.target !== ev.currentTarget) return;
            setShowControls((showControls) => !showControls);
          }}
        >
          {showControls ? children : null}
        </div>
      </div>
    );
  }
);

export default VideoOverlay;
