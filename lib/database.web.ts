import type { Track } from "@/lib/mintune-data";

export type StoredPlaylist = { id: string; name: string; count: number; tone: string; icon: string; isDefault: boolean };
export type PlayHistoryItem = { trackId: string; playedAt: number };
export type DatabaseState = { tracks: Track[]; playlists: StoredPlaylist[]; favorites: string[]; history: PlayHistoryItem[] };
export const DATABASE_NAME = "mintune.db";
export const DATABASE_VERSION = 4;
const STORAGE_KEY = "mintune:web-database:v4";
type WebState = { tracks: Track[]; playlists: StoredPlaylist[]; favorites: string[]; history: PlayHistoryItem[]; playlistTracks: Record<string, string[]> };
let state: WebState = { tracks: [], playlists: [], favorites: [], history: [], playlistTracks: {} };
let initialized = false;

function persist() { if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function initializeDatabase() {
  if (initialized) return;
  initialized = true;
  try { const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null; if (saved) state = { ...state, ...JSON.parse(saved) }; } catch { /* use empty state */ }
}
export function listTracks() { initializeDatabase(); return [...state.tracks].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)); }
export function getStoredTrack(id: string) { initializeDatabase(); return state.tracks.find((track) => track.id === id); }
export function saveTrackMetadata(track: Track) { initializeDatabase(); const next = { ...track, createdAt: track.createdAt ?? Date.now() }; const index = state.tracks.findIndex((item) => item.id === track.id); if (index >= 0) state.tracks[index] = next; else state.tracks.push(next); persist(); return next; }
export function listPlaylists() { initializeDatabase(); return state.playlists.map((playlist) => ({ ...playlist, count: state.playlistTracks[playlist.id]?.length ?? 0 })); }
export function getPlaylistTracksFromDatabase(playlistId: string) { initializeDatabase(); const ids = state.playlistTracks[playlistId] ?? []; return ids.map((id) => state.tracks.find((track) => track.id === id)).filter((track): track is Track => Boolean(track)); }
export function createPlaylist(name: string, tone = "#6ee7b7", icon = "queue-music") { initializeDatabase(); const cleanName = name.trim(); if (!cleanName) throw new Error("歌单名称不能为空"); const playlist = { id: `custom-${Date.now()}`, name: cleanName, count: 0, tone, icon, isDefault: false }; state.playlists.push(playlist); state.playlistTracks[playlist.id] = []; persist(); return playlist; }
export function renamePlaylist(id: string, name: string) { initializeDatabase(); const cleanName = name.trim(); if (!cleanName) throw new Error("歌单名称不能为空"); const playlist = state.playlists.find((item) => item.id === id && !item.isDefault); if (playlist) playlist.name = cleanName; persist(); }
export function deletePlaylist(id: string) { initializeDatabase(); const playlist = state.playlists.find((item) => item.id === id); if (!playlist?.isDefault) { state.playlists = state.playlists.filter((item) => item.id !== id); delete state.playlistTracks[id]; persist(); } }
export function addTrackToPlaylist(playlistId: string, trackId: string) { initializeDatabase(); const items = state.playlistTracks[playlistId] ?? []; if (!items.includes(trackId)) state.playlistTracks[playlistId] = [...items, trackId]; persist(); }
export function removeTrackFromPlaylist(playlistId: string, trackId: string) { initializeDatabase(); state.playlistTracks[playlistId] = (state.playlistTracks[playlistId] ?? []).filter((id) => id !== trackId); persist(); }
export function listFavoriteIds() { initializeDatabase(); return [...state.favorites]; }
export function setFavorite(trackId: string, favorite: boolean) { initializeDatabase(); state.favorites = favorite ? Array.from(new Set([...state.favorites, trackId])) : state.favorites.filter((id) => id !== trackId); persist(); }
export function recordPlay(trackId: string, playedAt = Date.now()) { initializeDatabase(); state.history = [{ trackId, playedAt }, ...state.history.filter((item) => item.trackId !== trackId)].slice(0, 1000); persist(); }
export function listPlayHistory(limit = 20) { initializeDatabase(); return state.history.slice(0, limit); }
export function getWeeklyListeningSeconds() { initializeDatabase(); const since = Date.now() - 7 * 24 * 60 * 60 * 1000; return state.history.filter((item) => item.playedAt >= since).reduce((sum, item) => sum + (state.tracks.find((track) => track.id === item.trackId)?.durationSeconds ?? 0), 0); }
export function getDatabaseState(): DatabaseState { return { tracks: listTracks(), playlists: listPlaylists(), favorites: listFavoriteIds(), history: listPlayHistory() }; }
