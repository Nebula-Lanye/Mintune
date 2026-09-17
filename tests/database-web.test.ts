import { beforeEach, describe, expect, it } from "vitest";
import { createPlaylist, deletePlaylist, getPlaylistTracksFromDatabase, initializeDatabase, listPlaylists } from "@/lib/database.web";

describe("Web database fallback", () => {
  beforeEach(() => initializeDatabase());

  it("seeds default playlists and their track relationships", () => {
    const focus = listPlaylists().find((playlist) => playlist.id === "focus");
    expect(focus?.isDefault).toBe(true);
    expect(getPlaylistTracksFromDatabase("focus").length).toBeGreaterThan(0);
  });

  it("creates and deletes a custom playlist", () => {
    const created = createPlaylist("通勤精选");
    expect(listPlaylists().some((playlist) => playlist.id === created.id)).toBe(true);
    deletePlaylist(created.id);
    expect(listPlaylists().some((playlist) => playlist.id === created.id)).toBe(false);
  });
});
