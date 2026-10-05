import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { MiniPlayer } from "@/components/mintune-ui";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { COLORS } from "@/lib/mintune-data";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 900;
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 9);
  return <>
    {isDesktop ? <DesktopSidebar /> : null}
    <MiniPlayer floating desktop={isDesktop} bottomOffset={isDesktop ? 18 : 66 + bottomPadding} />
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.mint,
      tabBarInactiveTintColor: COLORS.subtle,
      tabBarButton: HapticTab,
      tabBarStyle: isDesktop
        ? { display: "none" }
        : { height: 66 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding, backgroundColor: COLORS.background, borderTopColor: COLORS.divider, borderTopWidth: 1 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      sceneStyle: isDesktop
        ? { marginLeft: 224, paddingBottom: 86, backgroundColor: COLORS.background }
        : { backgroundColor: COLORS.background },
    }}>
      <Tabs.Screen name="index" options={{ title: "今日聆听", tabBarIcon: ({ color, size }) => <MaterialIcons name="home-filled" color={color} size={size} /> }} />
      <Tabs.Screen name="library" options={{ title: "音乐库", tabBarIcon: ({ color, size }) => <MaterialIcons name="library-music" color={color} size={size} /> }} />
      <Tabs.Screen name="playlists" options={{ title: "歌单", tabBarIcon: ({ color, size }) => <MaterialIcons name="queue-music" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "设置", tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" color={color} size={size} /> }} />
    </Tabs>
  </>;
}
