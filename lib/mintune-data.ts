export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  duration: string;
  durationSeconds: number;
  quality: "HI-RES" | "LOSSLESS" | "HIGH";
  coverUri: string;
  sourceUri: string;
};

export const TRACKS: Track[] = [
  { id: "sea-glass", title: "Sea Glass", artist: "Luna Park", album: "Tidal Rooms", genre: "Ambient", year: "2024", duration: "03:42", durationSeconds: 222, quality: "HI-RES", coverUri: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=85", sourceUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "slow-burn", title: "Slow Burn", artist: "Mira Sol", album: "Soft Focus", genre: "Indie Pop", year: "2023", duration: "04:08", durationSeconds: 248, quality: "LOSSLESS", coverUri: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=85", sourceUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "green-light", title: "Green Light", artist: "The Nori Club", album: "After Rain", genre: "Alternative", year: "2024", duration: "03:16", durationSeconds: 196, quality: "HIGH", coverUri: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=85", sourceUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "night-swim", title: "Night Swim", artist: "Kite String", album: "Low Tide", genre: "Electronic", year: "2022", duration: "05:12", durationSeconds: 312, quality: "HI-RES", coverUri: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85", sourceUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "paper-moon", title: "Paper Moon", artist: "Juniper Hale", album: "Open Windows", genre: "Singer-songwriter", year: "2023", duration: "03:58", durationSeconds: 238, quality: "LOSSLESS", coverUri: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=85", sourceUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
];

export const PLAYLISTS = [
  { id: "focus", name: "Focus Flow", count: 18, tone: "#A8D5BA", icon: "spa" as const },
  { id: "late-night", name: "Late Night", count: 24, tone: "#A9B6D9", icon: "nightlight" as const },
  { id: "new-finds", name: "New Finds", count: 12, tone: "#E5B98C", icon: "auto-awesome" as const },
];

export const LYRICS = [
  "A quiet room, a little light",
  "The city folds into the night",
  "We keep the windows open wide",
  "And let the softer weather inside",
  "Stay here until the colors fade",
  "A small escape that we have made",
  "No need to hurry, no need to know",
  "Just follow where the green lights glow",
];

export const FILTERS = ["全部", "最近添加", "HI-RES", "收藏"];
export const SORTS = ["标题", "最近添加", "艺人", "专辑"];
export const DEFAULT_FAVORITES = ["sea-glass", "paper-moon"];
export const COLORS = { background: "#10241D", surface: "#183328", surfaceAlt: "#203F31", mint: "#B7E7C8", text: "#F3F6F1", muted: "#87A89A", subtle: "#5C7A6D", divider: "#29483A", yellow: "#F1D3A7" };

export function formatSeconds(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function matchTrack(track: Track, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || [track.title, track.artist, track.album, track.genre].some((value) => value.toLowerCase().includes(needle));
}

export function getTrack(id: string) {
  return TRACKS.find((track) => track.id === id) ?? TRACKS[0];
}

export function getNextTrack(id: string, direction: 1 | -1 = 1) {
  const index = TRACKS.findIndex((track) => track.id === id);
  return TRACKS[(index + direction + TRACKS.length) % TRACKS.length];
}

export function getPlaylistTracks(id: string) {
  if (id === "late-night") return [TRACKS[3], TRACKS[0], TRACKS[4]];
  if (id === "new-finds") return [TRACKS[1], TRACKS[2], TRACKS[4]];
  return [TRACKS[0], TRACKS[2], TRACKS[1], TRACKS[4]];
}

export function getQualityColor(quality: Track["quality"]) {
  return quality === "HI-RES" ? COLORS.mint : quality === "LOSSLESS" ? COLORS.yellow : "#B3C6D9";
}

export function getActiveLyric(progress: number, duration: number) {
  return Math.min(LYRICS.length - 1, Math.floor((progress / Math.max(duration, 1)) * LYRICS.length));
}

export function getArtworkBackground(track: Track) {
  return { "sea-glass": "#1D4A37", "slow-burn": "#3F2E37", "green-light": "#294A43", "night-swim": "#222B4A", "paper-moon": "#47372C" }[track.id] ?? COLORS.surface;
}

export function getTrackMeta(track: Track) {
  return `${track.artist} · ${track.album}`;
}

export function getPlaylistMeta(id: string) {
  const playlist = PLAYLISTS.find((item) => item.id === id) ?? PLAYLISTS[0];
  return `${playlist.count} 首歌 · ${id === "focus" ? "适合专注" : id === "late-night" ? "适合夜晚" : "最近发现"}`;
}

export function getFavoriteTracks(favorites: string[]) {
  return TRACKS.filter((track) => favorites.includes(track.id));
}

export function toggleFavorite(id: string, favorites: string[]) {
  return favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
}

export function getSearchResults(query: string, filter: string, favorites: string[], tracks: Track[] = TRACKS) {
  return tracks.filter((track) => matchTrack(track, query)).filter((track) => filter === "HI-RES" ? track.quality === "HI-RES" : filter === "收藏" ? favorites.includes(track.id) : true);
}

export function getSortedTracks(tracks: Track[], sort: string) {
  return [...tracks].sort((a, b) => sort === "艺人" ? a.artist.localeCompare(b.artist) : sort === "专辑" ? a.album.localeCompare(b.album) : sort === "最近添加" ? b.year.localeCompare(a.year) : a.title.localeCompare(b.title));
}

export const APP_NAME = "Mintune";
export const APP_VERSION = "1.2.105";
export const APP_TAGLINE = "softly in tune";
export const REPO_URL = "https://github.com/Nebula-Lanye/Mintune";
export const SAMPLE_NOTE = "演示音频来自公开试听源。接入真实本地媒体扫描后，可替换为设备音频 URI。";
export const USER_NAME = "Lanye";
export const STORAGE_KEY = "mintune:preferences";
export const DEFAULT_QUEUE = TRACKS;
export const DEFAULT_TRACK_ID = TRACKS[0].id;
export const SUPPORTED_FORMATS = ["FLAC", "ALAC", "WAV", "MP3", "AAC"];
export const EQUALIZER_BANDS = ["60", "230", "910", "3.6k", "14k"];
export const EQUALIZER_PRESETS = ["平衡", "流行", "古典", "人声", "低音"];
export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5];
export const MOODS = ["放松", "专注", "夜晚", "通勤"];
export const SETTINGS_SECTIONS = ["外观", "播放与音质", "本地音乐", "关于 Mintune"];
export const DOCS_NOTE = "原 Android 文档中的 MediaStore、Room、Media3、LRC 与均衡器能力，后续可用 Expo 原生模块逐项接入。";
