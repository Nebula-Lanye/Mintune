import { openDatabaseSync } from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import type { Track } from "@/lib/mintune-data";

export type StoredPlaylist = { id: string; name: string; count: number; tone: string; icon: string; isDefault: boolean };
export type PlayHistoryItem = { trackId: string; playedAt: number };
export type DatabaseState = { tracks: Track[]; playlists: StoredPlaylist[]; favorites: string[]; history: PlayHistoryItem[]; playlistTracks?: Record<string, string[]> };

let database: SQLiteDatabase | null = null;
export const DATABASE_NAME = "mintune.db";
export const DATABASE_VERSION = 4;

function getDatabase() {
  if (!database) database = openDatabaseSync(DATABASE_NAME);
  return database;
}

export function initializeDatabase() {
  const db = getDatabase();
  db.execSync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT NOT NULL,
      genre TEXT NOT NULL, year TEXT NOT NULL, duration TEXT NOT NULL, duration_seconds INTEGER NOT NULL,
      quality TEXT NOT NULL, cover_uri TEXT NOT NULL, source_uri TEXT NOT NULL,
      lyrics TEXT, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, tone TEXT NOT NULL, icon TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT NOT NULL, track_id TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (playlist_id, track_id), FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS favorites (
      track_id TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, track_id TEXT NOT NULL, played_at INTEGER NOT NULL,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );`);
  const version = db.getFirstSync<{ user_version: number }>("PRAGMA user_version")?.user_version ?? 0;
  if (version < 2) {
    db.runSync("DELETE FROM favorites WHERE track_id IN ('sea-glass','slow-burn','green-light','night-swim','paper-moon')");
    db.runSync("DELETE FROM playlist_tracks WHERE track_id IN ('sea-glass','slow-burn','green-light','night-swim','paper-moon')");
    db.runSync("DELETE FROM tracks WHERE id IN ('sea-glass','slow-burn','green-light','night-swim','paper-moon')");
    db.runSync("DELETE FROM playlists WHERE id IN ('focus','late-night','new-finds')");
  }
  if (version < 3) {
    try { db.runSync("ALTER TABLE tracks ADD COLUMN lyrics TEXT"); } catch { /* column already exists */ }
  }
  db.execSync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  return db;
}

function upsertTrack(track: Track) {
  const createdAt = track.createdAt ?? Date.now();
  getDatabase().runSync(
    `INSERT INTO tracks (id,title,artist,album,genre,year,duration,duration_seconds,quality,cover_uri,source_uri,lyrics,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title,artist=excluded.artist,album=excluded.album,genre=excluded.genre,
     year=excluded.year,duration=excluded.duration,duration_seconds=excluded.duration_seconds,quality=excluded.quality,
     cover_uri=excluded.cover_uri,source_uri=excluded.source_uri,lyrics=excluded.lyrics`,
    track.id, track.title, track.artist, track.album, track.genre, track.year, track.duration,
    track.durationSeconds, track.quality, track.coverUri, track.sourceUri, track.lyrics ?? null, createdAt,
  );
}

function createPlaylistRecord(id: string, name: string, tone: string, icon: string, isDefault = false) {
  getDatabase().runSync("INSERT OR IGNORE INTO playlists (id,name,tone,icon,is_default) VALUES (?,?,?,?,?)", id, name, tone, icon, isDefault ? 1 : 0);
}

function mapTrack(row: Record<string, unknown>): Track {
  return {
    id: String(row.id), title: String(row.title), artist: String(row.artist), album: String(row.album), genre: String(row.genre),
    year: String(row.year), duration: String(row.duration), durationSeconds: Number(row.duration_seconds),
    quality: String(row.quality) as Track["quality"], coverUri: String(row.cover_uri), sourceUri: String(row.source_uri),
    lyrics: row.lyrics == null ? undefined : String(row.lyrics), createdAt: Number(row.created_at) < 1_000_000_000_000 ? Number(row.created_at) * 1000 : Number(row.created_at),
  };
}

export function listTracks() { initializeDatabase(); return getDatabase().getAllSync<Record<string, unknown>>("SELECT * FROM tracks ORDER BY created_at DESC, title ASC").map(mapTrack); }
export function getStoredTrack(id: string) { initializeDatabase(); const row = getDatabase().getFirstSync<Record<string, unknown>>("SELECT * FROM tracks WHERE id = ?", id); return row ? mapTrack(row) : undefined; }
export function saveTrackMetadata(track: Track) { initializeDatabase(); upsertTrack(track); return track; }
export function listPlaylists() {
  initializeDatabase();
  return getDatabase().getAllSync<StoredPlaylist & { is_default: number }>(`SELECT p.id,p.name,p.tone,p.icon,p.is_default,COUNT(pt.track_id) AS count FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id=p.id GROUP BY p.id ORDER BY p.is_default DESC,p.created_at ASC`).map((item) => ({ ...item, isDefault: Boolean(item.is_default) }));
}
export function getPlaylistTracksFromDatabase(playlistId: string) {
  initializeDatabase();
  return getDatabase().getAllSync<Record<string, unknown>>(`SELECT t.* FROM tracks t JOIN playlist_tracks pt ON pt.track_id=t.id WHERE pt.playlist_id=? ORDER BY pt.position ASC`, playlistId).map(mapTrack);
}
export function createPlaylist(name: string, tone = "#6ee7b7", icon = "queue-music") {
  initializeDatabase(); const cleanName = name.trim(); if (!cleanName) throw new Error("歌单名称不能为空");
  const id = `custom-${Date.now()}`; createPlaylistRecord(id, cleanName, tone, icon, false); return listPlaylists().find((playlist) => playlist.id === id)!;
}
export function renamePlaylist(id: string, name: string) { initializeDatabase(); const cleanName = name.trim(); if (!cleanName) throw new Error("歌单名称不能为空"); getDatabase().runSync("UPDATE playlists SET name=? WHERE id=? AND is_default=0", cleanName, id); }
export function deletePlaylist(id: string) { initializeDatabase(); getDatabase().runSync("DELETE FROM playlists WHERE id=? AND is_default=0", id); }
export function addTrackToPlaylist(playlistId: string, trackId: string) { initializeDatabase(); const position = getDatabase().getFirstSync<{ next_position: number }>("SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM playlist_tracks WHERE playlist_id=?", playlistId)?.next_position ?? 0; getDatabase().runSync("INSERT OR IGNORE INTO playlist_tracks (playlist_id,track_id,position) VALUES (?,?,?)", playlistId, trackId, position); }
export function removeTrackFromPlaylist(playlistId: string, trackId: string) { initializeDatabase(); getDatabase().runSync("DELETE FROM playlist_tracks WHERE playlist_id=? AND track_id=?", playlistId, trackId); }
export function listFavoriteIds() { initializeDatabase(); return getDatabase().getAllSync<{ track_id: string }>("SELECT track_id FROM favorites ORDER BY created_at ASC").map((item) => item.track_id); }
export function setFavorite(trackId: string, favorite: boolean) { initializeDatabase(); if (favorite) getDatabase().runSync("INSERT OR IGNORE INTO favorites (track_id) VALUES (?)", trackId); else getDatabase().runSync("DELETE FROM favorites WHERE track_id=?", trackId); }
export function recordPlay(trackId: string, playedAt = Date.now()) { initializeDatabase(); getDatabase().runSync("DELETE FROM play_history WHERE track_id=?", trackId); getDatabase().runSync("INSERT INTO play_history (track_id, played_at) VALUES (?,?)", trackId, playedAt); getDatabase().runSync("DELETE FROM play_history WHERE id NOT IN (SELECT id FROM play_history ORDER BY played_at DESC LIMIT 1000)"); }
export function listPlayHistory(limit = 20) { initializeDatabase(); return getDatabase().getAllSync<{ track_id: string; played_at: number }>("SELECT track_id,played_at FROM play_history ORDER BY played_at DESC LIMIT ?", limit).map((item) => ({ trackId: item.track_id, playedAt: item.played_at })); }
export function getWeeklyListeningSeconds() { initializeDatabase(); const since = Date.now() - 7 * 24 * 60 * 60 * 1000; return getDatabase().getFirstSync<{ total: number }>("SELECT COALESCE(SUM(t.duration_seconds),0) AS total FROM play_history h JOIN tracks t ON t.id=h.track_id WHERE h.played_at>=?", since)?.total ?? 0; }
export function getDatabaseState(): DatabaseState { const playlistTracks: Record<string, string[]> = {}; listPlaylists().forEach((playlist) => { playlistTracks[playlist.id] = getDatabase().getAllSync<{ track_id: string }>("SELECT track_id FROM playlist_tracks WHERE playlist_id=? ORDER BY position ASC", playlist.id).map((item) => item.track_id); }); return { tracks: listTracks(), playlists: listPlaylists(), favorites: listFavoriteIds(), history: listPlayHistory(), playlistTracks }; }

export function exportDatabaseBackup() { return JSON.stringify({ app: "Mintune", version: 1, exportedAt: new Date().toISOString(), state: getDatabaseState() }, null, 2); }

export function importDatabaseBackup(raw: string) {
  const payload = JSON.parse(raw) as { app?: string; state?: DatabaseState };
  if (payload.app !== "Mintune" || !payload.state) throw new Error("这不是有效的 Mintune 备份文件。");
  const state = payload.state; const db = initializeDatabase();
  db.withTransactionSync(() => {
    db.execSync("DELETE FROM playlist_tracks; DELETE FROM favorites; DELETE FROM play_history; DELETE FROM playlists; DELETE FROM tracks;");
    state.tracks.forEach((track) => upsertTrack(track));
    state.playlists.forEach((playlist) => createPlaylistRecord(playlist.id, playlist.name, playlist.tone, playlist.icon, playlist.isDefault));
    state.favorites.forEach((id) => setFavorite(id, true));
    state.history.forEach((item) => recordPlay(item.trackId, item.playedAt));
    Object.entries(state.playlistTracks ?? {}).forEach(([playlistId, ids]) => ids.forEach((trackId, position) => db.runSync("INSERT OR IGNORE INTO playlist_tracks (playlist_id,track_id,position) VALUES (?,?,?)", playlistId, trackId, position)));
  });
  return state.tracks.length;
}
