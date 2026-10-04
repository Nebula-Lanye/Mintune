const WIDE_METADATA_EXTENSIONS = new Set(["flac", "alac", "m4a", "mp3", "wav", "aac", "opus", "ape", "wv", "dsf", "dff"]);

export function usesWideMetadataParser(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return WIDE_METADATA_EXTENSIONS.has(extension);
}

export function filenameMetadata(filename: string) {
  const base = filename.replace(/\.[^/.]+$/, "").replace(/_+/g, " ").trim() || "未命名歌曲";
  const parts = base.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(" - ") };
  return { artist: "本地音乐", title: base };
}
