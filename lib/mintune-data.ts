export type Track = {
  id: string; title: string; artist: string; album: string; genre: string; year: string; duration: string; durationSeconds: number;
  quality: "HI-RES" | "LOSSLESS" | "HIGH" | "MEDIUM" | "LOW"; coverUri: string; sourceUri: string; lyrics?: string; createdAt?: number;
};

export const COLORS = { background: "#0d1b2e", surface: "#12233c", surfaceAlt: "#162c47", mint: "#5eead4", text: "#f3f6f1", muted: "#a8b8cc", subtle: "#6f829c", divider: "#1e3552", hires: "#5eead4", lossless: "#38bdf8", high: "#6f829c", medium: "#fbbf24", low: "#fb7185", brandDeep: "#0d1b2e" };
export const FILTERS = ["全部", "最近添加", "HI-RES", "收藏"];
export const SORTS = ["标题", "最近添加", "艺人", "专辑"];
export const APP_NAME = "Mintune";
export const APP_VERSION = "0.4.755";
export const APP_TAGLINE = "softly in tune";
export const REPO_URL = "https://github.com/Nebula-Lanye/Mintune";
export const SUPPORTED_FORMATS = ["FLAC", "ALAC", "WAV", "MP3", "AAC", "M4A", "OPUS", "APE", "WV", "DSF", "DFF"];
export const EQUALIZER_BANDS = ["31", "63", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"];
export const EQUALIZER_PRESETS = ["平衡", "流行", "古典", "人声", "低音"];
export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5];
export const SETTINGS_SECTIONS = ["外观", "播放与音质", "本地音乐", "关于 Mintune"];

export function formatSeconds(value: number) { const seconds = Math.max(0, Math.floor(value)); return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`; }
export function matchTrack(track: Track, query: string) { const needle = query.trim().toLowerCase(); return !needle || [track.title, track.artist, track.album, track.genre, track.lyrics ?? ""].some((value) => value.toLowerCase().includes(needle)); }
export function getNextTrack(tracks: Track[], id: string, direction: 1 | -1 = 1) { if (!tracks.length) return undefined; const index = tracks.findIndex((track) => track.id === id); return tracks[(index + direction + tracks.length) % tracks.length]; }
export function getQualityColor(quality: Track["quality"]) { return quality === "HI-RES" ? COLORS.hires : quality === "LOSSLESS" ? COLORS.lossless : quality === "HIGH" ? COLORS.high : quality === "MEDIUM" ? COLORS.medium : COLORS.low; }
export function getSearchResults(query: string, filter: string, favorites: string[], tracks: Track[] = []) { const now = Date.now(); return tracks.filter((track) => matchTrack(track, query)).filter((track) => filter === "HI-RES" ? track.quality === "HI-RES" : filter === "收藏" ? favorites.includes(track.id) : filter === "最近添加" ? Boolean(track.createdAt && now - track.createdAt <= 30 * 24 * 60 * 60 * 1000) : true); }
export function getSortedTracks(tracks: Track[], sort: string) { return [...tracks].sort((a, b) => sort === "艺人" ? a.artist.localeCompare(b.artist) : sort === "专辑" ? a.album.localeCompare(b.album) : sort === "最近添加" ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : a.title.localeCompare(b.title)); }
export function getTrackMeta(track: Track) { return `${track.artist} · ${track.album}`; }
export function toggleFavorite(id: string, favorites: string[]) { return favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]; }
