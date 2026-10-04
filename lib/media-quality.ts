import type { Track } from "@/lib/mintune-data";

export type QualityMetadata = { bitrate?: number | null; sampleRate?: number | null; bitsPerSample?: number | null };

export function qualityFromMetadata(filename: string, metadata: QualityMetadata | null): Track["quality"] {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (metadata?.bitsPerSample && metadata.bitsPerSample >= 24) return "HI-RES";
  if ((metadata?.sampleRate ?? 0) >= 96000 || (metadata?.bitrate ?? 0) >= 900000) return "HI-RES";
  if (["flac", "alac", "wav"].includes(extension)) return "LOSSLESS";
  const bitrate = metadata?.bitrate ?? 0;
  if (bitrate >= 256000) return "HIGH";
  if (bitrate >= 128000) return "MEDIUM";
  return "LOW";
}
