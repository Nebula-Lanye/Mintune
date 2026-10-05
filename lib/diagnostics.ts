import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const LOG_KEY = "mintune.diagnostics.v1";
const MAX_ENTRIES = 240;
let installed = false;
let previousGlobalHandler: ((error: unknown, isFatal?: boolean) => void) | undefined;

type DiagnosticEntry = {
  at: string;
  type: "event" | "error" | "fatal";
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
};

function stringifyError(error: unknown) {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  if (typeof error === "string") return { message: error };
  try { return { message: JSON.stringify(error) }; } catch { return { message: String(error) }; }
}

async function readEntries(): Promise<DiagnosticEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function writeDiagnostic(type: DiagnosticEntry["type"], message: string, context?: Record<string, unknown>, stack?: string) {
  try {
    const entries = await readEntries();
    entries.push({ at: new Date().toISOString(), type, message, context, stack });
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Diagnostics must never be able to crash or block the player.
  }
}

export function logEvent(message: string, context?: Record<string, unknown>) {
  void writeDiagnostic("event", message, context);
}

export function logError(error: unknown, context?: Record<string, unknown>, fatal = false) {
  const parsed = stringifyError(error);
  void writeDiagnostic(fatal ? "fatal" : "error", parsed.message, context, parsed.stack);
}

export function installGlobalDiagnostics() {
  if (installed) return;
  installed = true;
  const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: { getGlobalHandler?: () => typeof previousGlobalHandler; setGlobalHandler?: (handler: typeof previousGlobalHandler) => void } }).ErrorUtils;
  previousGlobalHandler = errorUtils?.getGlobalHandler?.();
  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    logError(error, { source: "ErrorUtils", isFatal: Boolean(isFatal) }, Boolean(isFatal));
    previousGlobalHandler?.(error, isFatal);
  });
  logEvent("app_start", { platform: require("react-native").Platform.OS });
}

export async function exportDiagnostics() {
  const entries = await readEntries();
  const path = `${FileSystem.cacheDirectory}mintune-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const payload = { app: "Mintune", exportedAt: new Date().toISOString(), entries };
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
  return path;
}

export async function clearDiagnostics() {
  await AsyncStorage.removeItem(LOG_KEY);
}
