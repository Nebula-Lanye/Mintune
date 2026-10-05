import * as FileSystem from "expo-file-system/legacy";
import { File } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { MusicInfo } from "expo-music-info-2";
import { parseBuffer } from "music-metadata";
import { decode, encode } from "base-64";
import { Platform } from "react-native";
import type { Track } from "@/lib/mintune-data";
import { filenameMetadata, usesWideMetadataParser } from "@/lib/local-media-metadata";
import { isArtworkFilename, pictureDataUri, sidecarArtworkNames } from "@/lib/cover-utils";
import { qualityFromMetadata } from "@/lib/media-quality";

const fallbackArtwork = "mintune-local";
export type EmbeddedMetadata = {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  genre?: string | null;
  picture?: { pictureData?: string | null; format?: string | null; mime?: string | null } | null;
  lyrics?: string | null;
  bitrate?: number | null;
  sampleRate?: number | null;
  bitsPerSample?: number | null;
};

function extensionOf(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function lyricsText(value: unknown) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => typeof item === "string" ? item : item && typeof item === "object" && "text" in item ? String(item.text) : "").filter(Boolean).join("\n") || undefined;
}

function bytesToDataUri(bytes: Uint8Array, format: string) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return `data:${format || "image/jpeg"};base64,${encode(binary)}`;
}

async function readWideMetadata(uri: string, filename: string): Promise<EmbeddedMetadata | null> {
  try {
    let bytes: Uint8Array;
    try {
      bytes = await new File(uri).bytes();
    } catch {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      bytes = Uint8Array.from(decode(base64), (character) => character.charCodeAt(0));
    }
    const metadata = await parseBuffer(bytes, { path: filename, size: bytes.byteLength }, { skipCovers: false });
    const picture = metadata.common.picture?.[0];
    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      genre: metadata.common.genre?.[0],
      lyrics: lyricsText(metadata.common.lyrics),
      bitrate: metadata.format.bitrate,
      sampleRate: metadata.format.sampleRate,
      bitsPerSample: metadata.format.bitsPerSample,
      picture: picture ? { pictureData: bytesToDataUri(picture.data, picture.format), format: picture.format } : null,
    };
  } catch {
    if (__DEV__) console.warn(`[Mintune] wide metadata parse failed: ${filename}`);
    // Unsupported tags, protected files, and inaccessible content URIs use the normal fallback.
    return null;
  }
}

async function readEmbeddedMetadata(uri: string, filename: string): Promise<EmbeddedMetadata | null> {
  if (usesWideMetadataParser(filename)) {
    const wide = await readWideMetadata(uri, filename);
    if (wide) return wide;
  }
  try {
    const metadata = await MusicInfo.getMusicInfoAsync(uri, { title: true, artist: true, album: true, genre: true, picture: true });
    return metadata as EmbeddedMetadata | null;
  } catch {
    if (__DEV__) console.warn(`[Mintune] narrow metadata parse failed: ${filename}`);
    return null;
  }
}

async function readSidecarArtwork(audioUri: string, filename: string) {
  if (!audioUri.startsWith("file://") && !audioUri.startsWith("/")) return undefined;
  const audioPath = audioUri.startsWith("file://") ? audioUri.slice(7) : audioUri;
  const slash = audioPath.lastIndexOf("/");
  if (slash < 0) return undefined;
  const directory = audioPath.slice(0, slash);
  try {
    for (const name of sidecarArtworkNames(filename)) {
      const candidate = `${directory}/${name}`;
      const info = await FileSystem.getInfoAsync(candidate);
      if (info.exists && !info.isDirectory) return `file://${candidate}`;
    }
    const files = await FileSystem.readDirectoryAsync(directory);
    const fallback = files.find(isArtworkFilename);
    return fallback ? `file://${directory}/${fallback}` : undefined;
  } catch {
    return undefined;
  }
}

async function readSidecarLyrics(audioUri: string) {
  if (!audioUri.startsWith("file://") && !audioUri.startsWith("/")) return undefined;
  const audioPath = audioUri.startsWith("file://") ? audioUri.slice(7) : audioUri;
  const dot = audioPath.lastIndexOf(".");
  if (dot < 0) return undefined;
  try {
    const candidate = `${audioPath.slice(0, dot)}.lrc`;
    const info = await FileSystem.getInfoAsync(candidate);
    if (!info.exists || info.isDirectory) return undefined;
    return await FileSystem.readAsStringAsync(candidate);
  } catch {
    return undefined;
  }
}

async function persistEmbeddedCover(picture: string | undefined, trackId: string) {
  if (!picture?.startsWith("data:") || Platform.OS === "web") return picture;
  const match = picture.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return picture;
  try {
    const extension = match[1].split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const path = `${FileSystem.cacheDirectory}mintune-cover-${trackId.replace(/[^a-z0-9_-]/gi, "_")}.${extension}`;
    await FileSystem.writeAsStringAsync(path, match[2], { encoding: FileSystem.EncodingType.Base64 });
    return path;
  } catch {
    return picture;
  }
}

export type ScanProgress = { current: number; total: number; filename: string; track?: Track };

export async function scanLocalAudio(onProgress?: (progress: ScanProgress) => void): Promise<Track[]> {
  if (Platform.OS === "web") return [];
  const available = await MediaLibrary.isAvailableAsync();
  if (!available) return [];

  const permission = await MediaLibrary.requestPermissionsAsync(false, ["audio"]);
  if (!permission.granted) throw new Error("未获得音乐文件访问权限，请在系统设置中允许 Mintune 访问音频。 ");

  const assets: MediaLibrary.Asset[] = [];
  let page = await MediaLibrary.getAssetsAsync({ first: 500, mediaType: MediaLibrary.MediaType.audio, sortBy: [[MediaLibrary.SortBy.creationTime, false]] });
  assets.push(...page.assets);
  while (page.hasNextPage) {
    page = await MediaLibrary.getAssetsAsync({ first: 500, after: page.endCursor, mediaType: MediaLibrary.MediaType.audio, sortBy: [[MediaLibrary.SortBy.creationTime, false]] });
    assets.push(...page.assets);
  }
  const audioAssets = assets.filter((asset) => asset.mediaType === "audio");
  let completed = 0;
  onProgress?.({ current: 0, total: audioAssets.length, filename: "准备读取设备媒体库…" });
  const imported: Track[] = [];
  for (let start = 0; start < audioAssets.length; start += 6) {
    const batch = audioAssets.slice(start, start + 6);
    const tracks = await Promise.all(batch.map(async (asset) => {
    const fallback = filenameMetadata(asset.filename);
    const info = await MediaLibrary.getAssetInfoAsync(asset.id).catch(() => null);
    const sourceUri = info?.localUri ?? asset.uri;
    const metadata = await readEmbeddedMetadata(sourceUri, asset.filename);
    const lyrics = metadata?.lyrics?.trim() || await readSidecarLyrics(sourceUri);
    const durationSeconds = Math.max(1, Math.round(asset.duration || 0));
    const title = metadata?.title?.trim() || fallback.title;
    const artist = metadata?.artist?.trim() || fallback.artist;
    const album = metadata?.album?.trim() || "设备音乐";
    const genre = metadata?.genre?.trim() || "本地音频";
    const picture = pictureDataUri(metadata?.picture);
    const sidecar = picture ? undefined : await readSidecarArtwork(sourceUri, asset.filename);
    const coverUri = await persistEmbeddedCover(picture, `local-${asset.id}`) || sidecar || fallbackArtwork;
    completed += 1;
    const track = {
      id: `local-${asset.id}`,
      title,
      artist,
      album,
      genre,
      year: asset.creationTime ? String(new Date(asset.creationTime).getFullYear()) : "未知",
      duration: `${String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:${String(durationSeconds % 60).padStart(2, "0")}`,
      durationSeconds,
      quality: qualityFromMetadata(asset.filename, metadata),
      coverUri,
      sourceUri,
      lyrics,
      createdAt: Date.now(),
    } satisfies Track;
    onProgress?.({ current: completed, total: audioAssets.length, filename: asset.filename, track });
    return track;
    }));
    imported.push(...tracks);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return imported;
}
