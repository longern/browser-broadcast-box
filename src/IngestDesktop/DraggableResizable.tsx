import React from "react";

export default function DraggableResizeable({
  children,
  x,
  y,
  width,
  height,
  scale,
  onDrag,
  onResize,
  style,
}: {
  children: React.ReactNode;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
  onDrag: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  style?: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [dragStartX, setDragStartX] = React.useState(0);
  const [dragStartY, setDragStartY] = React.useState(0);
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);

  const [resizeDragging, setResizeDragging] = React.useState(false);
  const [resizeDragStartX, setResizeDragStartX] = React.useState(0);
  const [resizeDragStartY, setResizeDragStartY] = React.useState(0);
  const [resizeOffsetX, setResizeOffsetX] = React.useState(0);
  const [resizeOffsetY, setResizeOffsetY] = React.useState(0);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setOffsetX((e.clientX - dragStartX) / (scale || 1));
    setOffsetY((e.clientY - dragStartY) / (scale || 1));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    onDrag(x + offsetX, y + offsetY);
    setOffsetX(0);
    setOffsetY(0);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    setResizeDragging(true);
    setResizeDragStartX(e.clientX);
    setResizeDragStartY(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDragging) return;
    setResizeOffsetX((e.clientX - resizeDragStartX) / (scale || 1));
    setResizeOffsetY((e.clientY - resizeDragStartY) / (scale || 1));
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDragging) return;
    setResizeDragging(false);
    onResize!(width! + resizeOffsetX, height! + resizeOffsetY);
    setResizeOffsetX(0);
    setResizeOffsetY(0);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: x + offsetX,
        top: y + offsetY,
        width: width ? width + resizeOffsetX : undefined,
        height: height ? height + resizeOffsetY : undefined,
        cursor: dragging ? "grabbing" : "grab",
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {children}
        {onResize && (
          <div
            style={{
              position: "absolute",
              right: -5,
              bottom: -5,
              width: 10,
              height: 10,
              pointerEvents: "all",
              cursor: "nwse-resize",
            }}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
        )}
      </div>
    </div>
  );
}
