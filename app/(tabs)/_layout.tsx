import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { COLORS } from "@/lib/mintune-data";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 9);
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: COLORS.mint,
    tabBarInactiveTintColor: COLORS.subtle,
    tabBarButton: HapticTab,
    tabBarStyle: { height: 66 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding, backgroundColor: COLORS.background, borderTopColor: COLORS.divider, borderTopWidth: 1 },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
  }}>
    <Tabs.Screen name="index" options={{ title: "今日聆听", tabBarIcon: ({ color, size }) => <MaterialIcons name="home-filled" color={color} size={size} /> }} />
    <Tabs.Screen name="library" options={{ title: "音乐库", tabBarIcon: ({ color, size }) => <MaterialIcons name="library-music" color={color} size={size} /> }} />
    <Tabs.Screen name="playlists" options={{ title: "歌单", tabBarIcon: ({ color, size }) => <MaterialIcons name="queue-music" color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{ title: "设置", tabBarIcon: ({ color, size }) => <MaterialIcons name="tune" color={color} size={size} /> }} />
  </Tabs>;
}
