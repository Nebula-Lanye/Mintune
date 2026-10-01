export type PlaybackAction = "pause-current" | "resume-current" | "play-new";

export function getPlaybackAction(currentTrackId: string | null | undefined, nextTrackId: string, isPlaying: boolean): PlaybackAction {
  if (currentTrackId !== nextTrackId) return "play-new";
  return isPlaying ? "pause-current" : "resume-current";
}

export type DisposableAudio = {
  pause?: () => void;
  remove?: () => void;
  release?: () => void;
};

export function disposeAudioPlayer(audio: DisposableAudio | null | undefined) {
  if (!audio) return;
  try { audio.pause?.(); } catch { /* best effort */ }
  try { audio.remove?.(); } catch { try { audio.release?.(); } catch { /* best effort */ } }
}
