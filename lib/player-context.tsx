import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { usePathname, useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { DEFAULT_FAVORITES, DEFAULT_QUEUE, DEFAULT_TRACK_ID, PLAYLISTS, Track, getNextTrack, getPlaylistTracks as getStaticPlaylistTracks, getTrack, toggleFavorite } from "@/lib/mintune-data";
import { addTrackToPlaylist, createPlaylist as createPlaylistRecord, deletePlaylist as deletePlaylistRecord, getDatabaseState, getPlaylistTracksFromDatabase, initializeDatabase, listPlaylists, listTracks, removeTrackFromPlaylist, saveTrackMetadata, setFavorite, type StoredPlaylist } from "@/lib/database";

type PlayerContextValue = {
  currentTrack: Track;
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
  openPlayer: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_QUEUE);
  const [playlists, setPlaylists] = useState<StoredPlaylist[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track>(getTrack(DEFAULT_TRACK_ID));
  const [queue, setQueue] = useState<Track[]>(DEFAULT_QUEUE);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  const refreshDatabase = useCallback(() => {
    try {
      const state = getDatabaseState();
      setTracks(state.tracks);
      setQueue((items) => items.length ? items.map((item) => state.tracks.find((track) => track.id === item.id) ?? item) : state.tracks);
      setPlaylists(state.playlists);
      setFavorites(state.favorites);
      setCurrentTrack((current) => state.tracks.find((track) => track.id === current.id) ?? state.tracks[0] ?? current);
      setIsReady(true);
    } catch {
      setTracks(DEFAULT_QUEUE);
      setQueue(DEFAULT_QUEUE);
      setPlaylists(PLAYLISTS.map((playlist) => ({ ...playlist, isDefault: true })));
      setFavorites(DEFAULT_FAVORITES);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    try { initializeDatabase(); } catch { /* Web preview can use the fallback state when native SQLite is unavailable. */ }
    refreshDatabase();
    if (Platform.OS !== "web") setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    return () => {
      const player = audioRef.current as unknown as { remove?: () => void } | null;
      player?.remove?.();
    };
  }, [refreshDatabase]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setProgress((value) => {
        const nextProgress = value + 1 / Math.max(currentTrack.durationSeconds, 1);
        if (nextProgress >= 1) {
          const nextTrack = getNextTrack(currentTrack.id);
          setCurrentTrack(nextTrack);
          setProgress(0);
          return 0;
        }
        return nextProgress;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentTrack, isPlaying]);

  const playTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);
    try {
      (audioRef.current as unknown as { remove?: () => void } | null)?.remove?.();
      const player = createAudioPlayer({ uri: track.sourceUri });
      audioRef.current = player;
      player.play();
    } catch { /* Keep controls usable when the preview has no native audio runtime. */ }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      (audioRef.current as unknown as { pause?: () => void } | null)?.pause?.();
      setIsPlaying(false);
      return;
    }
    try {
      if (audioRef.current) (audioRef.current as unknown as { play?: () => void }).play?.();
      else {
        const player = createAudioPlayer({ uri: currentTrack.sourceUri });
        audioRef.current = player;
        player.play();
      }
    } catch { /* Browser fallback still updates the visual player state. */ }
    setIsPlaying(true);
  }, [currentTrack.sourceUri, isPlaying]);

  const move = useCallback((direction: 1 | -1) => playTrack(getNextTrack(currentTrack.id, direction)), [currentTrack.id, playTrack]);
  const seek = useCallback((value: number) => {
    const nextProgress = Math.min(1, Math.max(0, value));
    setProgress(nextProgress);
    (audioRef.current as unknown as { seekTo?: (seconds: number) => void } | null)?.seekTo?.(nextProgress * currentTrack.durationSeconds);
  }, [currentTrack.durationSeconds]);

  const toggleFavoriteTrack = useCallback((trackId = currentTrack.id) => {
    const next = toggleFavorite(trackId, favorites);
    setFavorite(trackId, next.includes(trackId));
    setFavorites(next);
  }, [currentTrack.id, favorites]);

  const addToQueue = useCallback((track: Track) => setQueue((items) => items.some((item) => item.id === track.id) ? items : [...items, track]), []);
  const createPlaylist = useCallback((name: string) => { const playlist = createPlaylistRecord(name); refreshDatabase(); return playlist; }, [refreshDatabase]);
  const deletePlaylist = useCallback((id: string) => { deletePlaylistRecord(id); refreshDatabase(); }, [refreshDatabase]);
  const addTrack = useCallback((playlistId: string, trackId: string) => { addTrackToPlaylist(playlistId, trackId); refreshDatabase(); }, [refreshDatabase]);
  const removeTrack = useCallback((playlistId: string, trackId: string) => { removeTrackFromPlaylist(playlistId, trackId); refreshDatabase(); }, [refreshDatabase]);
  const getPlaylistTracks = useCallback((playlistId: string) => { try { const result = getPlaylistTracksFromDatabase(playlistId); return result.length ? result : getStaticPlaylistTracks(playlistId); } catch { return getStaticPlaylistTracks(playlistId); } }, []);
  const saveMetadata = useCallback((track: Track) => { saveTrackMetadata(track); refreshDatabase(); }, [refreshDatabase]);
  const openPlayer = useCallback(() => { if (pathname !== "/player") router.push("/player" as never); }, [pathname, router]);

  const value = useMemo(() => ({ currentTrack, tracks, queue, playlists, favorites, isReady, isPlaying, progress, playTrack, togglePlay, next: () => move(1), previous: () => move(-1), seek, toggleFavoriteTrack, addToQueue, createPlaylist, deletePlaylist, addTrackToPlaylist: addTrack, removeTrackFromPlaylist: removeTrack, getPlaylistTracks, saveTrackMetadata: saveMetadata, refreshDatabase, openPlayer }), [addTrack, addToQueue, createPlaylist, currentTrack, deletePlaylist, favorites, getPlaylistTracks, isPlaying, isReady, move, openPlayer, playlists, playTrack, progress, queue, refreshDatabase, removeTrack, saveMetadata, seek, toggleFavoriteTrack, togglePlay, tracks]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside PlayerProvider");
  return value;
}
