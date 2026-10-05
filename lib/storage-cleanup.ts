import * as FileSystem from "expo-file-system/legacy";
import { clearDiagnostics } from "@/lib/diagnostics";

const CACHE_PREFIXES = ["mintune-cover-", "mintune-backup-"];
const DIAGNOSTIC_PREFIX = "mintune-diagnostics-";

type FileInfo = { uri: string; name: string; size: number };

async function listOwnedFiles(prefixes: string[]): Promise<FileInfo[]> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) return [];
  try {
    const names = await FileSystem.readDirectoryAsync(directory);
    const result: FileInfo[] = [];
    for (const name of names) {
      if (!prefixes.some((prefix) => name.startsWith(prefix))) continue;
      const uri = `${directory}${name}`;
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory)
        result.push({ uri, name, size: info.size ?? 0 });
    }
    return result;
  } catch {
    return [];
  }
}

export async function getStorageSummary() {
  const [cacheFiles, diagnosticFiles] = await Promise.all([
    listOwnedFiles(CACHE_PREFIXES),
    listOwnedFiles([DIAGNOSTIC_PREFIX]),
  ]);
  const sum = (files: FileInfo[]) =>
    files.reduce((total, file) => total + file.size, 0);
  return {
    cacheFiles: cacheFiles.length,
    cacheBytes: sum(cacheFiles),
    diagnosticFiles: diagnosticFiles.length,
    diagnosticBytes: sum(diagnosticFiles),
  };
}

async function removeFiles(files: FileInfo[]) {
  await Promise.all(
    files.map((file) =>
      FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(
        () => undefined,
      ),
    ),
  );
}

export async function clearAppCache() {
  await removeFiles(await listOwnedFiles(CACHE_PREFIXES));
}

export async function clearDiagnosticStorage() {
  await clearDiagnostics();
  await removeFiles(await listOwnedFiles([DIAGNOSTIC_PREFIX]));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
