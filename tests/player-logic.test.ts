import { describe, expect, it, vi } from "vitest";
import { disposeAudioPlayer, getPlaybackAction } from "@/lib/player-logic";

describe("single-player playback logic", () => {
  it("pauses the current track when tapped again", () => {
    expect(getPlaybackAction("track-a", "track-a", true)).toBe("pause-current");
    expect(getPlaybackAction("track-a", "track-a", false)).toBe("resume-current");
  });

  it("starts a new track instead of stacking players", () => {
    expect(getPlaybackAction("track-a", "track-b", true)).toBe("play-new");
  });

  it("pauses and removes the previous audio player", () => {
    const audio = { pause: vi.fn(), remove: vi.fn() };
    disposeAudioPlayer(audio);
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.remove).toHaveBeenCalledOnce();
  });
});
