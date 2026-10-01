import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { MusicInfo } from "expo-music-info-2";
import { parseBuffer } from "music-metadata";
import { decode, encode } from "base-64";
import { Platform } from "react-native";
import type { Track } from "@/lib/mintune-data";
import { filenameMetadata, usesWideMetadataParser } from "@/lib/local-media-metadata";
import { isArtworkFilename, pictureDataUri, sidecarArtworkNames } from "@/lib/cover-utils";

const fallbackArtwork = "mintune-local";
type EmbeddedMetadata = {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  genre?: string | null;
  picture?: { pictureData?: string | null; format?: string | null; mime?: string | null } | null;
};

function extensionOf(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function qualityFromFilename(filename: string): Track["quality"] {
  const extension = extensionOf(filename);
  return extension === "flac" || extension === "alac" || extension === "wav" ? "HI-RES" : "LOSSLESS";
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
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(decode(base64), (character) => character.charCodeAt(0));
    const metadata = await parseBuffer(bytes, { path: filename, size: bytes.byteLength }, { skipCovers: false });
    const picture = metadata.common.picture?.[0];
    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      genre: metadata.common.genre?.[0],
      picture: picture ? { pictureData: bytesToDataUri(picture.data, picture.format), format: picture.format } : null,
    };
  } catch {
    // Unsupported tags, protected files, and inaccessible content URIs use the normal fallback.
    return null;
  }
}

async function readEmbeddedMetadata(uri: string, filename: string): Promise<EmbeddedMetadata | null> {
  if (usesWideMetadataParser(filename)) {
    return readWideMetadata(uri, filename);
  }
  try {
    const metadata = await MusicInfo.getMusicInfoAsync(uri, { title: true, artist: true, album: true, genre: true, picture: true });
    return metadata as EmbeddedMetadata | null;
  } catch {
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

export async function scanLocalAudio(): Promise<Track[]> {
  if (Platform.OS === "web") return [];
  const available = await MediaLibrary.isAvailableAsync();
  if (!available) return [];

  const permission = await MediaLibrary.requestPermissionsAsync(false, ["audio"]);
  if (!permission.granted) throw new Error("未获得音乐文件访问权限，请在系统设置中允许 Mintune 访问音频。 ");

  const result = await MediaLibrary.getAssetsAsync({
    first: 1000,
    mediaType: MediaLibrary.MediaType.audio,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
  });

  return Promise.all(result.assets.filter((asset) => asset.mediaType === "audio").map(async (asset) => {
    const fallback = filenameMetadata(asset.filename);
    const info = await MediaLibrary.getAssetInfoAsync(asset.id).catch(() => null);
    const sourceUri = info?.localUri ?? asset.uri;
    const metadata = await readEmbeddedMetadata(sourceUri, asset.filename);
    const durationSeconds = Math.max(1, Math.round(asset.duration || 0));
    const title = metadata?.title?.trim() || fallback.title;
    const artist = metadata?.artist?.trim() || fallback.artist;
    const album = metadata?.album?.trim() || "设备音乐";
    const genre = metadata?.genre?.trim() || "本地音频";
    const picture = pictureDataUri(metadata?.picture);
    const sidecar = picture ? undefined : await readSidecarArtwork(sourceUri, asset.filename);

    return {
      id: `local-${asset.id}`,
      title,
      artist,
      album,
      genre,
      year: asset.creationTime ? String(new Date(asset.creationTime).getFullYear()) : "未知",
      duration: `${String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:${String(durationSeconds % 60).padStart(2, "0")}`,
      durationSeconds,
      quality: qualityFromFilename(asset.filename),
      coverUri: picture || sidecar || fallbackArtwork,
      sourceUri,
    } satisfies Track;
  }));
}
