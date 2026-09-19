import type { Track } from "@/lib/mintune-data";

export type StoredPlaylist = { id: string; name: string; count: number; tone: string; icon: string; isDefault: boolean };
export type DatabaseState = { tracks: Track[]; playlists: StoredPlaylist[]; favorites: string[] };
export const DATABASE_NAME = "mintune.db";
export const DATABASE_VERSION = 2;

let initialized = false;
let tracks: Track[] = [];
let playlists: StoredPlaylist[] = [];
let favorites: string[] = [];
let playlistTracks: Record<string, string[]> = {};

export function initializeDatabase() {
  if (initialized) return;
  initialized = true;
  tracks = [];
  playlists = [];
  playlistTracks = {};
  favorites = [];
}

export function listTracks() { initializeDatabase(); return [...tracks]; }
export function getStoredTrack(id: string) { initializeDatabase(); return tracks.find((track) => track.id === id); }
export function saveTrackMetadata(track: Track) { initializeDatabase(); const index = tracks.findIndex((item) => item.id === track.id); if (index >= 0) tracks[index] = track; else tracks.push(track); return track; }
export function listPlaylists() { initializeDatabase(); return playlists.map((playlist) => ({ ...playlist, count: playlistTracks[playlist.id]?.length ?? 0 })); }
export function getPlaylistTracksFromDatabase(playlistId: string) { initializeDatabase(); const ids = playlistTracks[playlistId] ?? []; return ids.map((id) => tracks.find((track) => track.id === id)).filter((track): track is Track => Boolean(track)); }
export function createPlaylist(name: string, tone = "#A8D5BA", icon = "queue-music") { initializeDatabase(); const cleanName = name.trim(); if (!cleanName) throw new Error("歌单名称不能为空"); const playlist = { id: `custom-${Date.now()}`, name: cleanName, count: 0, tone, icon, isDefault: false }; playlists = [...playlists, playlist]; playlistTracks[playlist.id] = []; return playlist; }
export function deletePlaylist(id: string) { initializeDatabase(); const playlist = playlists.find((item) => item.id === id); if (!playlist?.isDefault) { playlists = playlists.filter((item) => item.id !== id); delete playlistTracks[id]; } }
export function addTrackToPlaylist(playlistId: string, trackId: string) { initializeDatabase(); const items = playlistTracks[playlistId] ?? []; if (!items.includes(trackId)) playlistTracks[playlistId] = [...items, trackId]; }
export function removeTrackFromPlaylist(playlistId: string, trackId: string) { initializeDatabase(); playlistTracks[playlistId] = (playlistTracks[playlistId] ?? []).filter((id) => id !== trackId); }
export function listFavoriteIds() { initializeDatabase(); return [...favorites]; }
export function setFavorite(trackId: string, favorite: boolean) { initializeDatabase(); favorites = favorite ? Array.from(new Set([...favorites, trackId])) : favorites.filter((id) => id !== trackId); }
export function getDatabaseState(): DatabaseState { return { tracks: listTracks(), playlists: listPlaylists(), favorites: listFavoriteIds() }; }
