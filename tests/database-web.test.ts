import { beforeEach, describe, expect, it } from "vitest";
import { createPlaylist, deletePlaylist, getPlaylistTracksFromDatabase, initializeDatabase, listPlaylists } from "@/lib/database.web";

describe("Web database fallback", () => {
  beforeEach(() => initializeDatabase());

  it("starts with an empty library and no seeded playlists", () => {
    expect(listPlaylists()).toHaveLength(0);
    expect(getPlaylistTracksFromDatabase("focus")).toHaveLength(0);
  });

  it("creates and deletes a custom playlist", () => {
    const created = createPlaylist("通勤精选");
    expect(listPlaylists().some((playlist) => playlist.id === created.id)).toBe(true);
    deletePlaylist(created.id);
    expect(listPlaylists().some((playlist) => playlist.id === created.id)).toBe(false);
  });
});
