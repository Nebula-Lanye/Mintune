import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { usePathname, useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import type { Track } from "@/lib/mintune-data";
import { addTrackToPlaylist, createPlaylist as createPlaylistRecord, deletePlaylist as deletePlaylistRecord, getDatabaseState, getPlaylistTracksFromDatabase, initializeDatabase, removeTrackFromPlaylist, saveTrackMetadata, setFavorite, type StoredPlaylist } from "@/lib/database";
import { scanLocalAudio } from "@/lib/local-media";
import { disposeAudioPlayer, type DisposableAudio } from "@/lib/player-logic";

type PlayerContextValue = {
  currentTrack: Track | null;
  tracks: Track[];
  queue: Track[];
  playlists: StoredPlaylist[];
  favorites: string[];
  isReady: boolean;
  isPlaying: boolean;
  progress: number;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (progress: number) => void;
  toggleFavoriteTrack: (trackId?: string) => void;
  addToQueue: (track: Track) => void;
  createPlaylist: (name: string) => StoredPlaylist;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  getPlaylistTracks: (playlistId: string) => Track[];
  saveTrackMetadata: (track: Track) => void;
  refreshDatabase: () => void;
  scanLocalMusic: () => Promise<number>;
  openPlayer: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<StoredPlaylist[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const playbackTokenRef = useRef(0);

  const disposeAudio = useCallback(() => {
    const audio = audioRef.current as unknown as DisposableAudio | null;
    audioRef.current = null;
    disposeAudioPlayer(audio);
  }, []);

  const refreshDatabase = useCallback(() => {
    try {
      const state = getDatabaseState();
      setTracks(state.tracks);
      setQueue((items) => items.length ? items.map((item) => state.tracks.find((track) => track.id === item.id) ?? item).filter(Boolean) : state.tracks);
      setPlaylists(state.playlists);
      setFavorites(state.favorites);
      setCurrentTrack((current) => current ? state.tracks.find((track) => track.id === current.id) ?? state.tracks[0] ?? null : state.tracks[0] ?? null);
      setIsPlaying((playing) => Boolean(playing && state.tracks.length));
      setIsReady(true);
    } catch {
      setTracks([]); setQueue([]); setPlaylists([]); setFavorites([]); setCurrentTrack(null); setIsPlaying(false); setIsReady(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { try { initializeDatabase(); } catch { /* native SQLite is unavailable in web preview */ } refreshDatabase(); }, 0);
    if (Platform.OS !== "web") setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    return () => { clearTimeout(timer); playbackTokenRef.current += 1; disposeAudio(); };
  }, [disposeAudio, refreshDatabase]);

  const playTrack = useCallback((track: Track) => {
    const token = playbackTokenRef.current + 1;
    playbackTokenRef.current = token;
    disposeAudio();
    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);
    setQueue((items) => items.length ? items : tracks);
    try {
      const audio = createAudioPlayer({ uri: track.sourceUri });
      if (playbackTokenRef.current !== token) {
        (audio as unknown as { remove?: () => void })?.remove?.();
        return;
      }
      audioRef.current = audio;
      audio.play();
    } catch {
      if (playbackTokenRef.current === token) setIsPlaying(false);
    }
  }, [disposeAudio, tracks]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    try {
      if (isPlaying) { (audioRef.current as unknown as { pause?: () => void } | null)?.pause?.(); setIsPlaying(false); return; }
      if (!audioRef.current) audioRef.current = createAudioPlayer({ uri: currentTrack.sourceUri });
      (audioRef.current as unknown as { play?: () => void }).play?.(); setIsPlaying(true);
    } catch { setIsPlaying(false); }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const timer = setInterval(() => setProgress((value) => {
      const nextProgress = value + 1 / Math.max(currentTrack.durationSeconds, 1);
      if (nextProgress >= 1) {
        const index = tracks.findIndex((track) => track.id === currentTrack.id);
        const nextTrack = tracks.length ? tracks[(index + 1) % tracks.length] : null;
        if (nextTrack) playTrack(nextTrack);
        else { disposeAudio(); setIsPlaying(false); }
        return 0;
      }
      return nextProgress;
    }), 1000);
    return () => clearInterval(timer);
  }, [currentTrack, disposeAudio, isPlaying, playTrack, tracks]);

  const move = useCallback((direction: 1 | -1) => { if (!currentTrack || !tracks.length) return; const index = tracks.findIndex((track) => track.id === currentTrack.id); playTrack(tracks[(index + direction + tracks.length) % tracks.length]); }, [currentTrack, playTrack, tracks]);
  const seek = useCallback((value: number) => { if (!currentTrack) return; const nextProgress = Math.min(1, Math.max(0, value)); setProgress(nextProgress); (audioRef.current as unknown as { seekTo?: (seconds: number) => void } | null)?.seekTo?.(nextProgress * currentTrack.durationSeconds); }, [currentTrack]);
  const toggleFavoriteTrack = useCallback((trackId = currentTrack?.id) => { if (!trackId) return; const next = favorites.includes(trackId) ? favorites.filter((item) => item !== trackId) : [...favorites, trackId]; setFavorite(trackId, next.includes(trackId)); setFavorites(next); }, [currentTrack, favorites]);
  const addToQueue = useCallback((track: Track) => setQueue((items) => items.some((item) => item.id === track.id) ? items : [...items, track]), []);
  const createPlaylist = useCallback((name: string) => { const playlist = createPlaylistRecord(name); refreshDatabase(); return playlist; }, [refreshDatabase]);
  const deletePlaylist = useCallback((id: string) => { deletePlaylistRecord(id); refreshDatabase(); }, [refreshDatabase]);
  const addTrack = useCallback((playlistId: string, trackId: string) => { addTrackToPlaylist(playlistId, trackId); refreshDatabase(); }, [refreshDatabase]);
  const removeTrack = useCallback((playlistId: string, trackId: string) => { removeTrackFromPlaylist(playlistId, trackId); refreshDatabase(); }, [refreshDatabase]);
  const getPlaylistTracks = useCallback((playlistId: string) => { try { return getPlaylistTracksFromDatabase(playlistId); } catch { return []; } }, []);
  const saveMetadata = useCallback((track: Track) => { saveTrackMetadata(track); refreshDatabase(); }, [refreshDatabase]);
  const scanLocalMusic = useCallback(async () => { const imported = await scanLocalAudio(); imported.forEach(saveTrackMetadata); refreshDatabase(); return imported.length; }, [refreshDatabase, saveMetadata]);
  const openPlayer = useCallback(() => { if (currentTrack && pathname !== "/player") router.push("/player" as never); }, [currentTrack, pathname, router]);

  const value = useMemo(() => ({ currentTrack, tracks, queue, playlists, favorites, isReady, isPlaying, progress, playTrack, togglePlay, next: () => move(1), previous: () => move(-1), seek, toggleFavoriteTrack, addToQueue, createPlaylist, deletePlaylist, addTrackToPlaylist: addTrack, removeTrackFromPlaylist: removeTrack, getPlaylistTracks, saveTrackMetadata: saveMetadata, refreshDatabase, scanLocalMusic, openPlayer }), [addTrack, addToQueue, createPlaylist, currentTrack, deletePlaylist, favorites, getPlaylistTracks, isPlaying, isReady, move, openPlayer, playlists, playTrack, progress, queue, refreshDatabase, removeTrack, saveMetadata, scanLocalMusic, seek, toggleFavoriteTrack, togglePlay, tracks]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() { const value = useContext(PlayerContext); if (!value) throw new Error("usePlayer must be used inside PlayerProvider"); return value; }
