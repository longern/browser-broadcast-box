import React from "react";

import { mediaInputs } from "./mediaInputs";
import DraggableResizeable from "./DraggableResizable";
import VideoStream from "./VideoStream";

export type Source = {
  id: string;
  x: number;
  y: number;
} & (
  | {
      type: "image";
      src: string;
      width: number;
      height: number;
    }
  | {
      type: "screen";
      id: string;
    }
  | {
      type: "camera";
      id: string;
    }
  | {
      type: "text";
      content: string;
      color: string;
      fontSize: number;
    }
);

export default function Preview({
  sources,
  previewStream,
  onSourceChange,
}: {
  sources: Source[];
  previewStream: MediaStream;
  onSourceChange: (source: Source) => void;
}) {
  const [previewEnabled, setPreviewEnabled] = React.useState(false);
  const [scale, setScale] = React.useState(1);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;

    function zoomToFit() {
      const { width, height } = element!.getBoundingClientRect();
      const scale = Math.min(width / 1920, height / 1080);
      const child = element!.firstElementChild as HTMLDivElement;
      child.style.transform = `scale(${scale})`;
      setScale(scale);
    }

    const observer = new ResizeObserver(zoomToFit);
    observer.observe(element!);
    zoomToFit();

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        maxHeight: "100%",
        maxWidth: "100%",
        aspectRatio: 16 / 9,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 1920,
          height: 1080,
          backgroundColor: "black",
          transformOrigin: "left top",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setPreviewEnabled(!previewEnabled);
        }}
      >
        {previewEnabled ? (
          <VideoStream autoPlay playsInline muted stream={previewStream} />
        ) : (
          sources.map((source, index) => {
            const { x, y } = source;
            switch (source.type) {
              case "text":
                return (
                  <DraggableResizeable
                    key={source.id}
                    scale={scale}
                    {...source}
                    onDrag={(x, y) => onSourceChange({ ...source, x, y })}
                    style={{ zIndex: index }}
                  >
                    <span
                      style={{
                        userSelect: "none",
                        color: source.color,
                        fontFamily: "sans-serif",
                        fontSize: source.fontSize,
                        lineHeight: 1,
                      }}
                    >
                      {source.content}
                    </span>
                  </DraggableResizeable>
                );
              case "image":
                return (
                  <DraggableResizeable
                    key={source.id}
                    scale={scale}
                    {...source}
                    onDrag={(x, y) => onSourceChange({ ...source, x, y })}
                    onResize={(width, height) =>
                      onSourceChange({ ...source, width, height })
                    }
                    style={{ zIndex: index }}
                  >
                    <img
                      src={source.src}
                      alt=""
                      draggable={false}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        userSelect: "none",
                      }}
                    />
                  </DraggableResizeable>
                );
              case "screen":
              case "camera":
                return (
                  <div
                    key={source.id}
                    style={{
                      position: "absolute",
                      left: x,
                      top: y,
                      zIndex: index,
                    }}
                  >
                    <VideoStream
                      autoPlay
                      playsInline
                      muted
                      stream={mediaInputs[source.id]}
                    />
                  </div>
                );
              default:
                return null;
            }
          })
        )}
      </div>
    </div>
  );
}
