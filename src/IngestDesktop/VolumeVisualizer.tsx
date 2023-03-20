import React from "react";

export default function VolumeVisualizer({ stream }: { stream?: MediaStream }) {
  const [volume, setVolume] = React.useState(0);

  React.useEffect(() => {
    if (!stream) return;
    if (!stream.getAudioTracks().length) return;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let requestId = requestAnimationFrame(function tick() {
      analyser.getByteTimeDomainData(dataArray);
      const sum = dataArray.reduce((a, b) => a + (b - 128) ** 2, 0);
      const volume = (Math.sqrt(sum / bufferLength) * 2) / 128;
      setVolume(volume);
      requestId = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(requestId);
      audioContext.close();
    };
  }, [stream]);

  return (
    <div
      style={{
        width: "100%",
        height: 8,
        backgroundColor: "gray",
      }}
    >
      <div
        style={{
          width: `${Math.min(volume, 1) * 100}%`,
          height: "100%",
          backgroundColor: "green",
        }}
      ></div>
    </div>
  );
}
