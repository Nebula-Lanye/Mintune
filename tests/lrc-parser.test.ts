import { describe, expect, it } from "vitest";
import { currentLyricIndex, parseLrc } from "@/lib/lrc-parser";

describe("LRC parser", () => {
  it("parses centiseconds and sorts lines", () => {
    const lines = parseLrc("[00:03.50]第二行\n[00:01.00]第一行");
    expect(lines).toEqual([
      { timestampMs: 1000, text: "第一行" },
      { timestampMs: 3500, text: "第二行" },
    ]);
  });

  it("finds the current lyric line with binary search", () => {
    const lines = parseLrc("[00:01.00]a\n[00:03.00]b\n[00:05.00]c");
    expect(currentLyricIndex(lines, 500)).toBe(-1);
    expect(currentLyricIndex(lines, 3500)).toBe(1);
  });
});
