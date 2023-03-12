export function preferCodec(codecs, mimeType) {
  let otherCodecs = [];
  let sortedCodecs = [];

  codecs.forEach((codec) => {
    if (codec.mimeType === mimeType) {
      sortedCodecs.push(codec);
    } else {
      otherCodecs.push(codec);
    }
  });

  return sortedCodecs.concat(otherCodecs);
}
