import { describe, expect, it } from "vitest";
import { getNextTrack, getSearchResults, toggleFavorite, type Track } from "@/lib/mintune-data";

const tracks: Track[] = [
  { id: "a", title: "Night Walk", artist: "A", album: "One", genre: "Ambient", year: "2025", duration: "03:00", durationSeconds: 180, quality: "HI-RES", coverUri: "mintune-local", sourceUri: "file:///a", createdAt: Date.now() },
  { id: "b", title: "Morning", artist: "B", album: "Two", genre: "Pop", year: "2024", duration: "02:00", durationSeconds: 120, quality: "HIGH", coverUri: "mintune-local", sourceUri: "file:///b", createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000 },
];

describe("Mintune data helpers", () => {
  it("filters real tracks by query and quality", () => {
    expect(getSearchResults("night", "全部", []).map((track) => track.id)).toEqual([]);
    expect(getSearchResults("night", "全部", [], tracks).map((track) => track.id)).toEqual(["a"]);
    expect(getSearchResults("", "HI-RES", [], tracks).every((track) => track.quality === "HI-RES")).toBe(true);
  });
  it("filters recently added tracks by createdAt", () => { expect(getSearchResults("", "最近添加", [], tracks).map((track) => track.id)).toEqual(["a"]); });
  it("toggles favorites without mutating the source list", () => { const original = ["a"]; const next = toggleFavorite("b", original); expect(next).toEqual(["a", "b"]); expect(original).toEqual(["a"]); expect(toggleFavorite("a", next)).not.toContain("a"); });
  it("wraps to the next track", () => { expect(getNextTrack(tracks, "b")?.id).toBe("a"); });
});
