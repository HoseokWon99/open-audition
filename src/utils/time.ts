export function formatTransportTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
}

export function formatTimelineTimestamp(seconds: number, precision: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  const [wholeSeconds, decimalSeconds] = remainingSeconds.toFixed(precision).split(".");
  const formattedSeconds = `${wholeSeconds.padStart(2, "0")}${
    decimalSeconds ? `.${decimalSeconds}` : ""
  }`;
  return `${minutes}:${formattedSeconds}`;
}
