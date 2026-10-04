import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import { SchemeColors, type ColorScheme } from "@/constants/theme";

type ThemeContextValue = { colorScheme: ColorScheme; setColorScheme: (scheme: ColorScheme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = "mintune:theme:v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [hydrated, setHydrated] = useState(false);
  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme); Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") { const root = document.documentElement; root.dataset.theme = scheme; root.classList.toggle("dark", scheme === "dark"); Object.entries(SchemeColors[scheme]).forEach(([token, value]) => root.style.setProperty(`--color-${token}`, value)); }
  }, []);
  useEffect(() => { let active = true; AsyncStorage.getItem(THEME_KEY).then((saved) => { if (!active) return; if (saved === "light" || saved === "dark") setColorSchemeState(saved); setHydrated(true); }).catch(() => setHydrated(true)); return () => { active = false; }; }, []);
  useEffect(() => { applyScheme(colorScheme); if (hydrated) void AsyncStorage.setItem(THEME_KEY, colorScheme).catch(() => undefined); }, [applyScheme, colorScheme, hydrated]);
  const setColorScheme = useCallback((scheme: ColorScheme) => { setColorSchemeState(scheme); }, []);
  const themeVariables = useMemo(() => vars({ "color-primary": SchemeColors[colorScheme].primary, "color-background": SchemeColors[colorScheme].background, "color-surface": SchemeColors[colorScheme].surface, "color-foreground": SchemeColors[colorScheme].foreground, "color-muted": SchemeColors[colorScheme].muted, "color-border": SchemeColors[colorScheme].border, "color-success": SchemeColors[colorScheme].success, "color-warning": SchemeColors[colorScheme].warning, "color-error": SchemeColors[colorScheme].error }), [colorScheme]);
  const value = useMemo(() => ({ colorScheme, setColorScheme }), [colorScheme, setColorScheme]);
  return <ThemeContext.Provider value={value}><View style={[{ flex: 1 }, themeVariables]}>{children}</View></ThemeContext.Provider>;
}
export function useThemeContext(): ThemeContextValue { const ctx = useContext(ThemeContext); if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider"); return ctx; }
