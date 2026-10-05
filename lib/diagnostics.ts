import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { AppState, Dimensions, Platform } from "react-native";

const LOG_KEY = "mintune.diagnostics.v2";
const MAX_ENTRIES = 480;
const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let installed = false;
let sequence = 0;
let writeQueue = Promise.resolve();
let previousGlobalHandler: ((error: unknown, isFatal?: boolean) => void) | undefined;

type DiagnosticEntry = {
  seq: number;
  at: string;
  sessionId: string;
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

function appInfo() {
  const { width, height, scale } = Dimensions.get("window");
  return {
    platform: Platform.OS,
    appVersion: Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "unknown",
    nativeBuildVersion: Constants.nativeBuildVersion ?? "unknown",
    screen: { width, height, scale },
    sessionId,
  };
}

async function readEntries(): Promise<DiagnosticEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function writeDiagnostic(type: DiagnosticEntry["type"], message: string, context?: Record<string, unknown>, stack?: string) {
  const entry: DiagnosticEntry = { seq: ++sequence, at: new Date().toISOString(), sessionId, type, message, context, stack };
  writeQueue = writeQueue.then(async () => {
    try {
      const entries = await readEntries();
      entries.push(entry);
      await AsyncStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch {
      // Diagnostics must never be able to crash or block the player.
    }
  });
  return writeQueue;
}

export function logEvent(message: string, context?: Record<string, unknown>) {
  return writeDiagnostic("event", message, context);
}

export function logError(error: unknown, context?: Record<string, unknown>, fatal = false) {
  const parsed = stringifyError(error);
  return writeDiagnostic(fatal ? "fatal" : "error", parsed.message, context, parsed.stack);
}

export function installGlobalDiagnostics() {
  if (installed) return;
  installed = true;
  const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: { getGlobalHandler?: () => typeof previousGlobalHandler; setGlobalHandler?: (handler: typeof previousGlobalHandler) => void } }).ErrorUtils;
  previousGlobalHandler = errorUtils?.getGlobalHandler?.();
  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    void logError(error, { source: "ErrorUtils", isFatal: Boolean(isFatal), ...appInfo() }, Boolean(isFatal));
    previousGlobalHandler?.(error, isFatal);
  });
  void (async () => {
    const previous = await readEntries();
    const last = previous.at(-1);
    await logEvent("app_start", { ...appInfo(), previousSession: last ? { sessionId: last.sessionId, at: last.at, type: last.type, message: last.message, context: last.context } : null });
  })();
  AppState.addEventListener("change", (state) => { logEvent("app_state", { state, ...appInfo() }); });
}

export async function exportDiagnostics() {
  await writeQueue;
  const entries = await readEntries();
  const path = `${FileSystem.cacheDirectory}mintune-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const payload = { app: "Mintune", schema: "v2", exportedAt: new Date().toISOString(), sessionId, device: appInfo(), entries };
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
  return path;
}

export async function clearDiagnostics() {
  await writeQueue;
  await AsyncStorage.removeItem(LOG_KEY);
}
