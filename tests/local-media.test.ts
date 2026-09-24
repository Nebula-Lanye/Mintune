import { describe, expect, it } from "vitest";
import { filenameMetadata } from "@/lib/local-media-metadata";

describe("local media metadata fallback", () => {
  it("extracts artist and title from artist-title filenames", () => {
    expect(filenameMetadata("周杰伦 - 晴天.mp3")).toEqual({ artist: "周杰伦", title: "晴天" });
  });

  it("keeps a useful title when the filename has no artist separator", () => {
    expect(filenameMetadata("my_favorite_song.flac")).toEqual({ artist: "本地音乐", title: "my favorite song" });
  });
});
