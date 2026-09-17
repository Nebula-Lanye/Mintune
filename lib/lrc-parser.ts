export type LyricLine = { timestampMs: number; text: string };

const TIME = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;

export function parseLrc(content: string): LyricLine[] {
  const result: LyricLine[] = [];
  content.split(/\r?\n/).forEach((raw) => {
    const matches = [...raw.matchAll(TIME)];
    if (!matches.length) return;
    const text = raw.replace(TIME, "").trim();
    if (!text) return;
    matches.forEach((match) => {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3].length === 2 ? Number(match[3]) * 10 : Number(match[3]);
      result.push({ timestampMs: minutes * 60_000 + seconds * 1_000 + fraction, text });
    });
  });
  return result.sort((a, b) => a.timestampMs - b.timestampMs);
}

export function currentLyricIndex(lines: LyricLine[], positionMs: number) {
  if (!lines.length || positionMs < lines[0].timestampMs) return -1;
  let low = 0;
  let high = lines.length - 1;
  let answer = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lines[middle].timestampMs <= positionMs) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return answer;
}
