import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { usePathname, useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import type { Track } from "@/lib/mintune-data";
import { addTrackToPlaylist, createPlaylist as createPlaylistRecord, deletePlaylist as deletePlaylistRecord, getDatabaseState, getPlaylistTracksFromDatabase, initializeDatabase, listPlayHistory, recordPlay, removeTrackFromPlaylist, renamePlaylist as renamePlaylistRecord, saveTrackMetadata, setFavorite, type StoredPlaylist } from "@/lib/database";
import { scanLocalAudio, type ScanProgress } from "@/lib/local-media";
import { disposeAudioPlayer, type DisposableAudio } from "@/lib/player-logic";
import { EqAudioPlayer } from "@/lib/eq-audio-player";
import { logError, logEvent } from "@/lib/diagnostics";
import { Equalizer } from "@/lib/queue-equalizer";

type RepeatMode = "off" | "all" | "one";
type PlayerContextValue = {
  currentTrack: Track | null; tracks: Track[]; queue: Track[]; playlists: StoredPlaylist[]; favorites: string[]; history: Track[];
  isReady: boolean; isPlaying: boolean; progress: number; repeatMode: RepeatMode; shuffle: boolean; playbackSpeed: number; sleepRemaining: number | null;
  playTrack: (track: Track, queue?: Track[]) => void; togglePlay: () => void; next: () => void; previous: () => void; seek: (progress: number) => void;
  setPlaybackSpeed: (speed: number) => void; cycleRepeatMode: () => void; toggleShuffle: () => void; setSleepTimer: (minutes: number | null) => void;
  toggleFavoriteTrack: (trackId?: string) => void; addToQueue: (track: Track) => void; removeFromQueue: (trackId: string) => void; moveInQueue: (from: number, to: number) => void; clearQueue: () => void;
  createPlaylist: (name: string) => StoredPlaylist; renamePlaylist: (id: string, name: string) => void; deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void; removeTrackFromPlaylist: (playlistId: string, trackId: string) => void; getPlaylistTracks: (playlistId: string) => Track[];
  equalizerEnabled: boolean; setEqualizerEnabled: (enabled: boolean) => void; resetEqualizer: () => void; equalizerLevels: number[]; setEqualizerLevels: (levels: number[]) => void; saveTrackMetadata: (track: Track) => void; refreshDatabase: () => void; scanLocalMusic: (onProgress?: (progress: ScanProgress) => void) => Promise<number>; openPlayer: () => void;
};
const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  const [tracks, setTracks] = useState<Track[]>([]); const [playlists, setPlaylists] = useState<StoredPlaylist[]>([]); const [favorites, setFavorites] = useState<string[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null); const [queue, setQueue] = useState<Track[]>([]); const [history, setHistory] = useState<Track[]>([]);
  const [isReady, setIsReady] = useState(false); const [isPlaying, setIsPlaying] = useState(false); const [progress, setProgress] = useState(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off"); const [shuffle, setShuffle] = useState(false); const [playbackSpeed, setPlaybackSpeedState] = useState(1); const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  const [equalizerEnabled, setEqualizerEnabledState] = useState(false); const [equalizerLevels, setEqualizerLevelsState] = useState(Array(10).fill(0));
  const audioRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null); const playbackTokenRef = useRef(0);

  const disposeAudio = useCallback(() => { const audio = audioRef.current as unknown as DisposableAudio | null; audioRef.current = null; disposeAudioPlayer(audio); }, []);
  const refreshDatabase = useCallback(() => {
    try {
      const state = getDatabaseState();
      setTracks(state.tracks); setQueue((items) => items.length ? items.map((item) => state.tracks.find((track) => track.id === item.id) ?? item).filter(Boolean) : state.tracks);
      setPlaylists(state.playlists); setFavorites(state.favorites); setHistory(state.history.map((item) => state.tracks.find((track) => track.id === item.trackId)).filter((track): track is Track => Boolean(track)));
      setCurrentTrack((current) => current ? state.tracks.find((track) => track.id === current.id) ?? null : null); setIsReady(true);
    } catch { setTracks([]); setQueue([]); setPlaylists([]); setFavorites([]); setHistory([]); setCurrentTrack(null); setIsPlaying(false); setIsReady(true); }
  }, []);

  useEffect(() => { if (Platform.OS !== "web") void Equalizer.init().catch((error) => logError(error, { source: "equalizer_init" })); const timer = setTimeout(() => { try { initializeDatabase(); } catch { /* native SQLite unavailable in web preview */ } refreshDatabase(); }, 0); if (Platform.OS !== "web") void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "duckOthers", shouldRouteThroughEarpiece: false } as never).catch(() => undefined); return () => { clearTimeout(timer); playbackTokenRef.current += 1; disposeAudio(); }; }, [disposeAudio, refreshDatabase]);
  useEffect(() => { if (sleepRemaining == null) return; const timer = setInterval(() => setSleepRemaining((value) => { if (value == null || value <= 1) { setIsPlaying(false); (audioRef.current as unknown as { pause?: () => void } | null)?.pause?.(); return null; } return value - 1; }), 60000); return () => clearInterval(timer); }, [sleepRemaining]);

  const playTrack = useCallback((track: Track, requestedQueue?: Track[]) => {
    const token = playbackTokenRef.current + 1; playbackTokenRef.current = token; logEvent("play_track", { trackId: track.id, title: track.title, source: track.sourceUri }); disposeAudio(); setCurrentTrack(track); setProgress(0); setIsPlaying(false); recordPlay(track.id); refreshDatabase();
    if (requestedQueue?.length) setQueue(requestedQueue); else setQueue((items) => items.length ? items : tracks);
    try { const audio = Platform.OS === "web" ? createAudioPlayer(track.sourceUri) : new EqAudioPlayer({ uri: track.sourceUri, title: track.title, artist: track.artist, album: track.album, artworkUri: track.coverUri.startsWith("/") ? `file://${track.coverUri}` : track.coverUri === "mintune-local" ? undefined : track.coverUri, duration: track.durationSeconds, levels: equalizerLevels, playbackRate: playbackSpeed, onTime: (currentTime, duration, playing) => { if (playbackTokenRef.current !== token) return; setProgress(duration > 0 ? Math.min(1, currentTime / duration) : 0); setIsPlaying(playing); }, onEnded: () => { if (playbackTokenRef.current === token) advance(1); } }); if (playbackTokenRef.current !== token) { (audio as unknown as { remove?: () => void }).remove?.(); return; } audioRef.current = audio as ReturnType<typeof createAudioPlayer>; logEvent("audio_ref_attached", { trackId: track.id, title: track.title, native: Platform.OS !== "web" }); void Promise.resolve(audio.play()).then(() => { logEvent("audio_play_resolved", { trackId: track.id, title: track.title }); if (playbackTokenRef.current === token) setIsPlaying(true); }).catch((error) => { logError(error, { source: "play_track", trackId: track.id, title: track.title }); if (playbackTokenRef.current === token) { setIsPlaying(false); disposeAudio(); } });
      const subscription = Platform.OS === "web" ? (audio as unknown as { addListener?: (event: string, callback: (status: { currentTime?: number; duration?: number; playing?: boolean; didJustFinish?: boolean }) => void) => { remove: () => void } }).addListener?.("playbackStatusUpdate", (status) => { if (playbackTokenRef.current !== token) return; const duration = status.duration || track.durationSeconds; setProgress(duration > 0 ? Math.min(1, (status.currentTime || 0) / duration) : 0); setIsPlaying(Boolean(status.playing)); if (status.didJustFinish) advance(1); }) : undefined;
      (audio as unknown as { __mintuneSubscription?: { remove: () => void } }).__mintuneSubscription = subscription;
    } catch (error) { logError(error, { source: "create_audio_player", trackId: track.id, title: track.title }); if (playbackTokenRef.current === token) setIsPlaying(false); }
  }, [disposeAudio, equalizerLevels, playbackSpeed, refreshDatabase, tracks]);

  const advance = useCallback((direction: 1 | -1) => {
    if (!currentTrack) return;
    if (direction === 1 && repeatMode === "one") { seek(0); (audioRef.current as unknown as { play?: () => void } | null)?.play?.(); setIsPlaying(true); return; }
    const source = queue.length ? queue : tracks; if (!source.length) return;
    const index = source.findIndex((item) => item.id === currentTrack.id); let nextIndex = index + direction;
    if (shuffle && direction === 1) nextIndex = Math.floor(Math.random() * source.length);
    if (nextIndex >= source.length || nextIndex < 0) { if (repeatMode === "off") { setIsPlaying(false); return; } nextIndex = (nextIndex + source.length) % source.length; }
    playTrack(source[nextIndex], source);
  }, [currentTrack, playTrack, queue, repeatMode, shuffle, tracks]);
  const pausePlayback = useCallback(() => { logEvent("pause", { trackId: currentTrack?.id }); try { (audioRef.current as unknown as { pause?: () => void } | null)?.pause?.(); setIsPlaying(false); } catch (error) { logError(error, { source: "pause_audio", trackId: currentTrack?.id }); setIsPlaying(false); } }, [currentTrack]);
  const resumePlayback = useCallback(() => { if (!currentTrack) return; logEvent("resume", { trackId: currentTrack.id, title: currentTrack.title }); try { if (!audioRef.current) { audioRef.current = (Platform.OS === "web" ? createAudioPlayer(currentTrack.sourceUri) : new EqAudioPlayer({ uri: currentTrack.sourceUri, title: currentTrack.title, artist: currentTrack.artist, album: currentTrack.album, artworkUri: currentTrack.coverUri.startsWith("/") ? `file://${currentTrack.coverUri}` : currentTrack.coverUri === "mintune-local" ? undefined : currentTrack.coverUri, duration: currentTrack.durationSeconds, levels: equalizerLevels, playbackRate: playbackSpeed, onTime: (currentTime, duration, playing) => { setProgress(duration > 0 ? Math.min(1, currentTime / duration) : 0); setIsPlaying(playing); }, onEnded: () => advance(1) })) as ReturnType<typeof createAudioPlayer>; } void Promise.resolve((audioRef.current as unknown as { play?: () => void }).play?.()).then(() => setIsPlaying(true)).catch((error) => { logError(error, { source: "resume_audio", trackId: currentTrack.id }); setIsPlaying(false); }); } catch (error) { logError(error, { source: "resume_audio", trackId: currentTrack.id }); setIsPlaying(false); } }, [advance, currentTrack, equalizerLevels, playbackSpeed]);
  const togglePlay = useCallback(() => { if (isPlaying) pausePlayback(); else resumePlayback(); }, [isPlaying, pausePlayback, resumePlayback]);
  const seek = useCallback((value: number) => { if (!currentTrack) return; logEvent("seek", { trackId: currentTrack.id, progress: value }); const nextProgress = Math.min(1, Math.max(0, value)); setProgress(nextProgress); (audioRef.current as unknown as { seekTo?: (seconds: number) => void } | null)?.seekTo?.(nextProgress * currentTrack.durationSeconds); }, [currentTrack]);
  const setSpeed = useCallback((speed: number) => { const next = [0.75, 1, 1.25, 1.5].includes(speed) ? speed : 1; setPlaybackSpeedState(next); (audioRef.current as unknown as { setPlaybackRate?: (rate: number) => void } | null)?.setPlaybackRate?.(next); }, []);
  const setEqualizerLevels = useCallback((levels: number[]) => { const next = levels.map((level) => Math.max(-12, Math.min(12, Math.round((Number(level) || 0) * 2) / 2))).slice(0, 10); while (next.length < 10) next.push(0); setEqualizerLevelsState(next); void Equalizer.setAllBandGains(next).catch((error) => logError(error, { source: "equalizer_set_gains" })); (audioRef.current as unknown as { setEqualizer?: (levels: number[]) => void } | null)?.setEqualizer?.(next); }, []);
  const setEqualizerEnabled = useCallback((enabled: boolean) => { setEqualizerEnabledState(enabled); void Equalizer.setEnabled(enabled).catch((error) => logError(error, { source: "equalizer_set_enabled", enabled })); }, []);
  const resetEqualizer = useCallback(() => { const next = Array(10).fill(0); setEqualizerLevelsState(next); void Equalizer.reset().catch((error) => logError(error, { source: "equalizer_reset" })); }, []);
  const cycleRepeatMode = useCallback(() => setRepeatMode((mode) => mode === "off" ? "all" : mode === "all" ? "one" : "off"), []);
  const toggleShuffle = useCallback(() => setShuffle((value) => !value), []);
  const toggleFavoriteTrack = useCallback((trackId = currentTrack?.id) => { if (!trackId) return; const next = favorites.includes(trackId) ? favorites.filter((item) => item !== trackId) : [...favorites, trackId]; setFavorite(trackId, next.includes(trackId)); setFavorites(next); }, [currentTrack, favorites]);
  const addToQueue = useCallback((track: Track) => setQueue((items) => items.some((item) => item.id === track.id) ? items : [...items, track]), []);
  const removeFromQueue = useCallback((trackId: string) => setQueue((items) => items.filter((item) => item.id === currentTrack?.id || item.id !== trackId)), [currentTrack]);
  const moveInQueue = useCallback((from: number, to: number) => setQueue((items) => { if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items; const next = [...items]; const [item] = next.splice(from, 1); if (item) next.splice(to, 0, item); return next; }), []);
  const clearQueue = useCallback(() => setQueue(currentTrack ? [currentTrack] : []), [currentTrack]);
  const scanLocalMusic = useCallback(async (onProgress?: (progress: ScanProgress) => void) => { const imported = await scanLocalAudio((progress) => { if (progress.track) saveTrackMetadata(progress.track); onProgress?.(progress); }); refreshDatabase(); return imported.length; }, [refreshDatabase, saveTrackMetadata]);
  const createPlaylist = useCallback((name: string) => { const playlist = createPlaylistRecord(name); refreshDatabase(); return playlist; }, [refreshDatabase]);
  const renamePlaylist = useCallback((id: string, name: string) => { renamePlaylistRecord(id, name); refreshDatabase(); }, [refreshDatabase]);
  const deletePlaylist = useCallback((id: string) => { deletePlaylistRecord(id); refreshDatabase(); }, [refreshDatabase]);
  const addTrack = useCallback((playlistId: string, trackId: string) => { addTrackToPlaylist(playlistId, trackId); refreshDatabase(); }, [refreshDatabase]);
  const removeTrack = useCallback((playlistId: string, trackId: string) => { removeTrackFromPlaylist(playlistId, trackId); refreshDatabase(); }, [refreshDatabase]);
  const getPlaylistTracks = useCallback((playlistId: string) => { try { return getPlaylistTracksFromDatabase(playlistId); } catch { return []; } }, []);
  const saveMetadata = useCallback((track: Track) => { saveTrackMetadata(track); refreshDatabase(); }, [refreshDatabase]);
  const openPlayer = useCallback(() => { if (currentTrack && pathname !== "/player") router.push("/player" as never); }, [currentTrack, pathname, router]);
  const value = useMemo(() => ({ currentTrack, tracks, queue, playlists, favorites, history, isReady, isPlaying, progress, repeatMode, shuffle, playbackSpeed, sleepRemaining, equalizerEnabled, setEqualizerEnabled, resetEqualizer, equalizerLevels, setEqualizerLevels, playTrack, togglePlay, next: () => advance(1), previous: () => advance(-1), seek, setPlaybackSpeed: setSpeed, cycleRepeatMode, toggleShuffle, setSleepTimer: setSleepRemaining, toggleFavoriteTrack, addToQueue, removeFromQueue, moveInQueue, clearQueue, createPlaylist, renamePlaylist, deletePlaylist, addTrackToPlaylist: addTrack, removeTrackFromPlaylist: removeTrack, getPlaylistTracks, saveTrackMetadata: saveMetadata, refreshDatabase, scanLocalMusic, openPlayer }), [addTrack, addToQueue, advance, clearQueue, createPlaylist, currentTrack, cycleRepeatMode, deletePlaylist, equalizerEnabled, equalizerLevels, favorites, getPlaylistTracks, history, isPlaying, isReady, moveInQueue, openPlayer, playbackSpeed, playlists, playTrack, progress, queue, refreshDatabase, removeFromQueue, removeTrack, repeatMode, saveMetadata, scanLocalMusic, seek, setEqualizerEnabled, resetEqualizer, setEqualizerLevels, setSpeed, shuffle, sleepRemaining, toggleFavoriteTrack, togglePlay, tracks, renamePlaylist, toggleShuffle]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
export function usePlayer() { const value = useContext(PlayerContext); if (!value) throw new Error("usePlayer must be used inside PlayerProvider"); return value; }
