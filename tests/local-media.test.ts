import { describe, expect, it } from "vitest";
import { filenameMetadata, usesWideMetadataParser } from "@/lib/local-media-metadata";
import { pictureDataUri, sidecarArtworkNames } from "@/lib/cover-utils";

describe("local media metadata fallback", () => {
  it("extracts artist and title from artist-title filenames", () => {
    expect(filenameMetadata("周杰伦 - 晴天.mp3")).toEqual({ artist: "周杰伦", title: "晴天" });
  });

  it("keeps a useful title when the filename has no artist separator", () => {
    expect(filenameMetadata("my_favorite_song.flac")).toEqual({ artist: "本地音乐", title: "my favorite song" });
  });

  it("routes lossless formats through the embedded-cover parser", () => {
    expect(usesWideMetadataParser("album.flac")).toBe(true);
    expect(usesWideMetadataParser("album.alac")).toBe(true);
    expect(usesWideMetadataParser("album.m4a")).toBe(true);
    expect(usesWideMetadataParser("album.mp3")).toBe(false);
  });

  it("turns bare embedded base64 into a renderable data URI", () => {
    expect(pictureDataUri({ pictureData: "AQID", format: "image/png" })).toBe("data:image/png;base64,AQID");
    expect(pictureDataUri({ pictureData: "data:image/jpeg;base64,AQID" })).toBe("data:image/jpeg;base64,AQID");
  });

  it("prioritizes same-name artwork before conventional folder covers", () => {
    expect(sidecarArtworkNames("artist - song.flac").slice(0, 4)).toEqual([
      "artist - song.png",
      "artist - song.jpg",
      "artist - song.jpeg",
      "artist - song.webp",
    ]);
    expect(sidecarArtworkNames("artist - song.flac")).toContain("folder.jpg");
    expect(sidecarArtworkNames("artist - song.flac")).toContain("cover.jpg");
  });
});
