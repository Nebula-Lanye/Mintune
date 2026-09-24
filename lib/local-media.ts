import * as MediaLibrary from "expo-media-library";
import { MusicInfo } from "expo-music-info-2";
import { Platform } from "react-native";
import type { Track } from "@/lib/mintune-data";
import { filenameMetadata } from "@/lib/local-media-metadata";

const fallbackArtwork = "mintune-local";

type EmbeddedMetadata = {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  genre?: string | null;
  picture?: { pictureData?: string | null } | null;
};

function qualityFromFilename(filename: string): Track["quality"] {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension === "flac" || extension === "alac" || extension === "wav" ? "HI-RES" : "LOSSLESS";
}

async function readEmbeddedMetadata(uri: string): Promise<EmbeddedMetadata | null> {
  try {
    const metadata = await MusicInfo.getMusicInfoAsync(uri, { title: true, artist: true, album: true, genre: true, picture: true });
    return metadata as EmbeddedMetadata | null;
  } catch {
    // Some formats, content URIs, and files without ID3 tags cannot be parsed.
    return null;
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
    const metadata = await readEmbeddedMetadata(sourceUri);
    const durationSeconds = Math.max(1, Math.round(asset.duration || 0));
    const title = metadata?.title?.trim() || fallback.title;
    const artist = metadata?.artist?.trim() || fallback.artist;
    const album = metadata?.album?.trim() || "设备音乐";
    const genre = metadata?.genre?.trim() || "本地音频";
    const picture = metadata?.picture?.pictureData?.trim();

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
      coverUri: picture || fallbackArtwork,
      sourceUri,
    } satisfies Track;
  }));
}
