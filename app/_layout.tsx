import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { PlayerProvider } from "@/lib/player-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime } from "@/lib/_core/manus-runtime";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import "@/lib/_core/nativewind-pressable";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  const [trpcClient] = useState(() => createTRPCClient());

  useEffect(() => {
    initManusRuntime();
    if (Platform.OS !== "web") {
      const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => undefined), 350);
      return () => clearTimeout(timer);
    }
  }, []);
  useEffect(() => { if (Platform.OS !== "web") return; }, []);

  return <ThemeProvider>
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <PlayerProvider>
              <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="player" options={{ presentation: "modal" }} />
                <Stack.Screen name="lyrics" options={{ presentation: "modal" }} />
                <Stack.Screen name="equalizer" options={{ presentation: "modal" }} />
                <Stack.Screen name="oauth/callback" />
              </Stack>
            </PlayerProvider>
            <StatusBar style="light" />
          </QueryClientProvider>
        </trpc.Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  </ThemeProvider>;
}
