import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { usePathname, useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { DEFAULT_FAVORITES, DEFAULT_QUEUE, DEFAULT_TRACK_ID, STORAGE_KEY, Track, getNextTrack, getTrack, toggleFavorite } from "@/lib/mintune-data";

type PlayerContextValue = {
  currentTrack: Track;
  queue: Track[];
  favorites: string[];
  isPlaying: boolean;
  progress: number;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (progress: number) => void;
  toggleFavoriteTrack: (trackId?: string) => void;
  addToQueue: (track: Track) => void;
  openPlayer: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentTrack, setCurrentTrack] = useState<Track>(getTrack(DEFAULT_TRACK_ID));
  const [queue, setQueue] = useState<Track[]>(DEFAULT_QUEUE);
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    }
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { favorites?: string[]; currentId?: string };
        if (parsed.favorites) setFavorites(parsed.favorites);
        if (parsed.currentId) setCurrentTrack(getTrack(parsed.currentId));
      } catch {
        // Ignore malformed local preferences and keep the safe defaults.
      }
    });
    return () => {
      const player = audioRef.current as unknown as { remove?: () => void } | null;
      player?.remove?.();
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites, currentId: currentTrack.id })).catch(() => undefined);
  }, [favorites, currentTrack.id]);

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
      const previousPlayer = audioRef.current as unknown as { remove?: () => void } | null;
      previousPlayer?.remove?.();
      const player = createAudioPlayer({ uri: track.sourceUri });
      audioRef.current = player;
      player.play();
    } catch {
      // The preview remains fully usable when remote audio is unavailable.
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      (audioRef.current as unknown as { pause?: () => void } | null)?.pause?.();
      setIsPlaying(false);
      return;
    }
    try {
      if (audioRef.current) {
        (audioRef.current as unknown as { play?: () => void }).play?.();
      } else {
        const player = createAudioPlayer({ uri: currentTrack.sourceUri });
        audioRef.current = player;
        player.play();
      }
    } catch {
      // Keep the state interaction available in the browser preview.
    }
    setIsPlaying(true);
  }, [currentTrack.sourceUri, isPlaying]);

  const move = useCallback((direction: 1 | -1) => {
    const nextTrack = getNextTrack(currentTrack.id, direction);
    playTrack(nextTrack);
  }, [currentTrack.id, playTrack]);

  const seek = useCallback((value: number) => {
    const nextProgress = Math.min(1, Math.max(0, value));
    setProgress(nextProgress);
    const player = audioRef.current as unknown as { seekTo?: (seconds: number) => void } | null;
    player?.seekTo?.(nextProgress * currentTrack.durationSeconds);
  }, [currentTrack.durationSeconds]);

  const toggleFavoriteTrack = useCallback((trackId = currentTrack.id) => {
    setFavorites((items) => toggleFavorite(trackId, items));
  }, [currentTrack.id]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((items) => items.some((item) => item.id === track.id) ? items : [...items, track]);
  }, []);

  const openPlayer = useCallback(() => {
    if (pathname !== "/player") router.push("/player" as never);
  }, [pathname, router]);

  const value = useMemo(() => ({
    currentTrack, queue, favorites, isPlaying, progress, playTrack, togglePlay,
    next: () => move(1), previous: () => move(-1), seek, toggleFavoriteTrack, addToQueue, openPlayer,
  }), [addToQueue, currentTrack, favorites, isPlaying, move, openPlayer, playTrack, progress, queue, seek, toggleFavoriteTrack, togglePlay]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside PlayerProvider");
  return value;
}
