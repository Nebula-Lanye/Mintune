import { parseBuffer } from "music-metadata";
import { encode } from "base-64";
import type { Track } from "@/lib/mintune-data";
import { filenameMetadata } from "@/lib/local-media-metadata";
import { qualityFromMetadata } from "@/lib/media-quality";
import type { ScanProgress } from "@/lib/local-media";

const AUDIO_EXTENSIONS = new Set(["flac", "alac", "wav", "mp3", "aac", "m4a", "opus", "ape", "wv", "dsf", "dff", "ogg"]);
const fallbackArtwork = "mintune-local";

type DesktopFile = File & { webkitRelativePath?: string };

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function bytesToDataUri(bytes: Uint8Array, format: string) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return `data:${format || "image/jpeg"};base64,${encode(binary)}`;
}

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return String(value.find((item) => typeof item === "string") ?? "").trim();
  return "";
}

function normalizePath(path: string) {
  return path.replaceAll("\\", "/");
}

function siblingPath(audioPath: string, filename: string) {
  const slash = audioPath.lastIndexOf("/");
  return `${slash >= 0 ? audioPath.slice(0, slash + 1) : ""}${filename}`;
}

export async function scanDesktopFiles(
  files: FileList | File[],
  onProgress?: (progress: ScanProgress) => void,
): Promise<Track[]> {
  const all = Array.from(files) as DesktopFile[];
  const audioFiles = all.filter((file) => AUDIO_EXTENSIONS.has(extensionOf(file.name)));
  const fileMap = new Map(all.map((file) => [normalizePath(file.webkitRelativePath || file.name), file]));
  onProgress?.({ current: 0, total: audioFiles.length, filename: "准备读取文件夹…" });
  const imported: Track[] = [];

  for (let index = 0; index < audioFiles.length; index += 1) {
    const file = audioFiles[index];
    const path = normalizePath(file.webkitRelativePath || file.name);
    const fallback = filenameMetadata(file.name);
    let title = fallback.title;
    let artist = fallback.artist;
    let album = "本地文件夹";
    let genre = "本地音频";
    let lyrics: string | undefined;
    let coverUri = fallbackArtwork;
    let durationSeconds = 1;
    let quality: Track["quality"] = qualityFromMetadata(file.name, null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const metadata = await parseBuffer(bytes, { path: file.name, size: bytes.byteLength }, { skipCovers: false });
      title = textValue(metadata.common.title) || title;
      artist = textValue(metadata.common.artist) || textValue(metadata.common.artists) || artist;
      album = textValue(metadata.common.album) || album;
      genre = textValue(metadata.common.genre) || genre;
      lyrics = typeof metadata.common.lyrics?.[0] === "string" ? metadata.common.lyrics[0] : undefined;
      durationSeconds = Math.max(1, Math.round(metadata.format.duration || 0));
      quality = qualityFromMetadata(file.name, {
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
        bitsPerSample: metadata.format.bitsPerSample,
      });
      const picture = metadata.common.picture?.[0];
      if (picture) coverUri = bytesToDataUri(picture.data, picture.format);
    } catch {
      // Files with damaged or unsupported tags still remain importable through filename fallback.
    }

    const lrc = fileMap.get(siblingPath(path, `${file.name.slice(0, -extensionOf(file.name).length - 1)}.lrc`));
    if (!lyrics && lrc) lyrics = await lrc.text().catch(() => undefined);
    if (coverUri === fallbackArtwork) {
      const stem = file.name.slice(0, -extensionOf(file.name).length - 1).toLowerCase();
      const sibling = all.find((candidate) => {
        const candidatePath = normalizePath(candidate.webkitRelativePath || candidate.name);
        return siblingPath(path, candidate.name) === candidatePath && (candidate.name.toLowerCase().startsWith(stem) || ["cover.jpg", "cover.jpeg", "folder.jpg", "folder.png", "albumart.jpg"].includes(candidate.name.toLowerCase()));
      });
      if (sibling && !AUDIO_EXTENSIONS.has(extensionOf(sibling.name))) {
        const imageBytes = new Uint8Array(await sibling.arrayBuffer());
        const mime = sibling.type || "image/jpeg";
        coverUri = bytesToDataUri(imageBytes, mime);
      }
    }

    const sourceUri = URL.createObjectURL(file);
    const track = {
      id: `desktop-${path}`,
      title,
      artist,
      album,
      genre,
      year: String(new Date(file.lastModified).getFullYear()),
      duration: `${String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:${String(durationSeconds % 60).padStart(2, "0")}`,
      durationSeconds,
      quality,
      coverUri,
      sourceUri,
      lyrics,
      createdAt: Date.now(),
    } satisfies Track;
    imported.push(track);
    onProgress?.({ current: index + 1, total: audioFiles.length, filename: path, track });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return imported;
}

export function chooseDesktopFolder(
  onProgress?: (progress: ScanProgress) => void,
): Promise<Track[]> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("桌面文件夹选择器只能在 Web/Tauri 环境使用。"));
      return;
    }
    const input = document.createElement("input") as HTMLInputElement & { webkitdirectory?: boolean };
    input.type = "file";
    input.multiple = true;
    input.webkitdirectory = true;
    input.accept = ".flac,.alac,.wav,.mp3,.aac,.m4a,.opus,.ape,.wv,.dsf,.dff,.ogg";
    input.onchange = () => {
      const files = input.files;
      if (!files?.length) {
        resolve([]);
        return;
      }
      void scanDesktopFiles(files, onProgress).then(resolve, reject);
    };
    input.click();
  });
}
