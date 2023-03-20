let canvas = null;
let ctx = null;
let interval = null;
let sources = {};
let streams = {};
let streamCurrentFrame = {};

/** @param {WritableStream<VideoFrame>} output */
function startRendering(output, frameRate) {
  canvas = output;
  ctx = canvas.getContext("2d");

  ctx.textBaseline = "top";
  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const sourceId in sources) {
      const source = sources[sourceId];
      switch (source.type) {
        case "text":
          ctx.font = `${source.fontSize}px sans-serif`;
          ctx.fillStyle = source.color;
          ctx.fillText(source.content, source.x, source.y);
          break;
        case "image":
          if (source.src in streams) {
            const bitmap = streams[source.src];
            ctx.drawImage(
              bitmap,
              source.x,
              source.y,
              source.width,
              source.height
            );
          }
          break;
        case "screen":
        case "camera":
          if (source.id in streamCurrentFrame) {
            const currentFrame = streamCurrentFrame[source.id];
            ctx.drawImage(currentFrame, source.x, source.y);
          }
          break;
        default:
          break;
      }
    }
  }, 1000 / frameRate);
}

onmessage = function (e) {
  if (e.data.sources) sources = e.data.sources;
  if (e.data.streams) {
    Object.assign(streams, e.data.streams);

    for (const streamId in e.data.streams) {
      const stream = e.data.streams[streamId];
      if (!(stream instanceof ReadableStream)) continue;
      const reader = stream.getReader();
      reader.read().then(function readFrame({ done, value }) {
        if (done) {
          console.warn("Stream", streamId, "ended");
          delete streamCurrentFrame[streamId];
          return;
        }
        if (streamCurrentFrame[streamId]) streamCurrentFrame[streamId].close();
        streamCurrentFrame[streamId] = value;
        reader.read().then(readFrame);
      });
    }
  }

  if (e.data.output) {
    const { output, frameRate } = e.data;
    startRendering(output, frameRate);
  }
};
