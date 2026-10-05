import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { PlayerProvider } from "@/lib/player-context";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import "@/lib/_core/nativewind-pressable";
import { installGlobalDiagnostics } from "@/lib/diagnostics";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  useEffect(() => { installGlobalDiagnostics(); }, []);
  useEffect(() => {
    if (Platform.OS !== "web") {
      const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => undefined), 350);
      return () => clearTimeout(timer);
    }
  }, []);

  return <ThemeProvider><SafeAreaProvider><GestureHandlerRootView style={{ flex: 1 }}><PlayerProvider><Stack screenOptions={{ headerShown: false, animation: "fade" }}><Stack.Screen name="(tabs)" /><Stack.Screen name="player" options={{ presentation: "modal" }} /><Stack.Screen name="lyrics" options={{ presentation: "modal" }} /><Stack.Screen name="equalizer" options={{ presentation: "modal" }} /></Stack></PlayerProvider><StatusBar style="light" /></GestureHandlerRootView></SafeAreaProvider></ThemeProvider>;
}
