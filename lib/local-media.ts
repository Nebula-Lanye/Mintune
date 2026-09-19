import * as MediaLibrary from "expo-media-library";
import { Platform } from "react-native";
import type { Track } from "@/lib/mintune-data";

const artwork = "mintune-local";

function titleFromFilename(filename: string) {
  return filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || "未命名歌曲";
}

function qualityFromFilename(filename: string): Track["quality"] {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension === "flac" || extension === "alac" || extension === "wav" ? "HI-RES" : "LOSSLESS";
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

  return result.assets
    .filter((asset) => asset.mediaType === "audio")
    .map((asset) => {
      const title = titleFromFilename(asset.filename);
      const durationSeconds = Math.max(1, Math.round(asset.duration || 0));
      return {
        id: `local-${asset.id}`,
        title,
        artist: "本地音乐",
        album: "设备音乐",
        genre: "本地音频",
        year: asset.creationTime ? String(new Date(asset.creationTime).getFullYear()) : "未知",
        duration: `${String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:${String(durationSeconds % 60).padStart(2, "0")}`,
        durationSeconds,
        quality: qualityFromFilename(asset.filename),
        coverUri: artwork,
        sourceUri: asset.uri,
      } satisfies Track;
    });
}
