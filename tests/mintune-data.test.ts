import { describe, expect, it } from "vitest";
import { DEFAULT_FAVORITES, TRACKS, getNextTrack, getSearchResults, toggleFavorite } from "@/lib/mintune-data";

describe("Mintune data helpers", () => {
  it("filters tracks by query and quality", () => {
    expect(getSearchResults("night", "全部", DEFAULT_FAVORITES).map((track) => track.id)).toEqual(["night-swim"]);
    expect(getSearchResults("", "HI-RES", DEFAULT_FAVORITES).every((track) => track.quality === "HI-RES")).toBe(true);
  });

  it("toggles favorites without mutating the source list", () => {
    const next = toggleFavorite("green-light", DEFAULT_FAVORITES);
    expect(next).toContain("green-light");
    expect(DEFAULT_FAVORITES).not.toContain("green-light");
    expect(toggleFavorite("sea-glass", next)).not.toContain("sea-glass");
  });

  it("wraps to the next track", () => {
    expect(getNextTrack(TRACKS[TRACKS.length - 1].id).id).toBe(TRACKS[0].id);
  });
});
