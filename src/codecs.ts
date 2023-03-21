export function preferCodec(codecs: RTCRtpCodecCapability[], mimeType: string) {
  let otherCodecs: RTCRtpCodecCapability[] = [];
  let sortedCodecs: RTCRtpCodecCapability[] = [];

  codecs.forEach((codec) => {
    if (codec.mimeType === mimeType) {
      sortedCodecs.push(codec);
    } else {
      otherCodecs.push(codec);
    }
  });

  return sortedCodecs.concat(otherCodecs);
}
