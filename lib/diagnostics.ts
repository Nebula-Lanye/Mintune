import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { AppState, Dimensions, Platform } from "react-native";

const LEGACY_LOG_KEY = "mintune.diagnostics.v2";
const SESSION_INDEX_KEY = "mintune.diagnostics.sessions.v1";
const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const logKey = `mintune.diagnostics.session.${sessionId}`;
const MAX_ENTRIES = 240;
let installed = false;
let sequence = 0;
let writeQueue = Promise.resolve();
let previousGlobalHandler:
  | ((error: unknown, isFatal?: boolean) => void)
  | undefined;

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
  if (error instanceof Error)
    return { message: error.message, stack: error.stack };
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}
function appInfo() {
  const { width, height, scale } = Dimensions.get("window");
  return {
    platform: Platform.OS,
    appVersion:
      Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "unknown",
    nativeBuildVersion: Constants.nativeBuildVersion ?? "unknown",
    screen: { width, height, scale },
    sessionId,
  };
}
async function readEntries() {
  try {
    const raw = await AsyncStorage.getItem(logKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DiagnosticEntry[]) : [];
  } catch {
    return [];
  }
}
async function registerSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_INDEX_KEY);
    const sessions = raw ? JSON.parse(raw) : [];
    const next = [
      { id: sessionId, startedAt: new Date().toISOString() },
      ...(Array.isArray(sessions) ? sessions : []),
    ].slice(0, 20);
    await AsyncStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(next));
  } catch {
    /* diagnostics must never block startup */
  }
}
export function writeDiagnostic(
  type: DiagnosticEntry["type"],
  message: string,
  context?: Record<string, unknown>,
  stack?: string,
) {
  const entry: DiagnosticEntry = {
    seq: ++sequence,
    at: new Date().toISOString(),
    sessionId,
    type,
    message,
    context,
    stack,
  };
  writeQueue = writeQueue.then(async () => {
    try {
      const entries = await readEntries();
      entries.push(entry);
      await AsyncStorage.setItem(
        logKey,
        JSON.stringify(entries.slice(-MAX_ENTRIES)),
      );
    } catch {
      /* diagnostics must never be able to crash or block the player */
    }
  });
  return writeQueue;
}
export function logEvent(message: string, context?: Record<string, unknown>) {
  return writeDiagnostic("event", message, context);
}
export function logError(
  error: unknown,
  context?: Record<string, unknown>,
  fatal = false,
) {
  const parsed = stringifyError(error);
  return writeDiagnostic(
    fatal ? "fatal" : "error",
    parsed.message,
    context,
    parsed.stack,
  );
}
export function installGlobalDiagnostics() {
  if (installed) return;
  installed = true;
  const errorUtils = (
    globalThis as typeof globalThis & {
      ErrorUtils?: {
        getGlobalHandler?: () => typeof previousGlobalHandler;
        setGlobalHandler?: (handler: typeof previousGlobalHandler) => void;
      };
    }
  ).ErrorUtils;
  previousGlobalHandler = errorUtils?.getGlobalHandler?.();
  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    void logError(
      error,
      { source: "ErrorUtils", isFatal: Boolean(isFatal), ...appInfo() },
      Boolean(isFatal),
    );
    previousGlobalHandler?.(error, isFatal);
  });
  void (async () => {
    await registerSession();
    await logEvent("app_start", { ...appInfo(), logKey });
  })();
  AppState.addEventListener("change", (state) => {
    void logEvent("app_state", { state, ...appInfo() });
  });
}
export async function exportDiagnostics() {
  await writeQueue;
  const entries = await readEntries();
  const path = `${FileSystem.cacheDirectory}mintune-diagnostics-${sessionId}.json`;
  await FileSystem.writeAsStringAsync(
    path,
    JSON.stringify(
      {
        app: "Mintune",
        schema: "v3",
        exportedAt: new Date().toISOString(),
        sessionId,
        device: appInfo(),
        entries,
      },
      null,
      2,
    ),
  );
  return path;
}
export async function clearDiagnostics() {
  await writeQueue;
  try {
    const raw = await AsyncStorage.getItem(SESSION_INDEX_KEY);
    const sessions = raw ? JSON.parse(raw) : [];
    const keys = [
      LEGACY_LOG_KEY,
      logKey,
      ...(Array.isArray(sessions)
        ? sessions.map((item) => `mintune.diagnostics.session.${item.id}`)
        : []),
    ];
    await AsyncStorage.multiRemove([...new Set(keys)]);
    await AsyncStorage.removeItem(SESSION_INDEX_KEY);
  } catch {
    /* clearing logs is best effort */
  }
}
