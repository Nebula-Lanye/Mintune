import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { APP_NAME, APP_TAGLINE, APP_VERSION, COLORS } from "@/lib/mintune-data";
import { Icon } from "@/components/mintune-ui";

const NAV_ITEMS = [
  { label: "今日聆听", route: "/(tabs)", icon: "home-filled" as const },
  { label: "音乐库", route: "/(tabs)/library", icon: "library-music" as const },
  { label: "歌单", route: "/(tabs)/playlists", icon: "queue-music" as const },
  { label: "设置", route: "/(tabs)/settings", icon: "settings" as const },
];

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.mark}><Text style={styles.markText}>M</Text></View>
        <View><Text style={styles.name}>{APP_NAME.toUpperCase()}</Text><Text style={styles.tagline}>{APP_TAGLINE}</Text></View>
      </View>
      <Text style={styles.sectionLabel}>工作区</Text>
      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.route || (item.route === "/(tabs)" && pathname === "/");
          return <Pressable key={item.route} onPress={() => router.push(item.route as never)} style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}>
            <MaterialIcons name={item.icon} size={20} color={active ? COLORS.mint : COLORS.muted} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            {active ? <View style={styles.activeBar} /> : null}
          </Pressable>;
        })}
      </View>
      <View style={styles.bottomNote}>
        <Icon name="offline-pin" size={18} color={COLORS.mint} />
        <View style={{ flex: 1 }}><Text style={styles.noteTitle}>本地优先</Text><Text style={styles.noteText}>音乐只保存在这台设备</Text></View>
      </View>
      <Text style={styles.version}>Mintune desktop · {APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { position: "absolute", zIndex: 30, left: 0, top: 0, bottom: 0, width: 224, paddingHorizontal: 18, paddingTop: 28, paddingBottom: 22, backgroundColor: COLORS.surface, borderRightWidth: 1, borderRightColor: COLORS.divider },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6, marginBottom: 48 },
  mark: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.mint },
  markText: { color: COLORS.background, fontSize: 21, fontWeight: "900" },
  name: { color: COLORS.text, fontSize: 13, fontWeight: "900", letterSpacing: 2.2 },
  tagline: { color: COLORS.muted, fontSize: 9, marginTop: 3, letterSpacing: 0.5 },
  sectionLabel: { color: COLORS.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", paddingHorizontal: 12, marginBottom: 10 },
  navList: { gap: 5 },
  navItem: { height: 48, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 13, borderRadius: 12, position: "relative" },
  navItemActive: { backgroundColor: "rgba(94,234,212,0.12)" },
  navLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  navLabelActive: { color: COLORS.mint },
  activeBar: { position: "absolute", right: 0, width: 3, height: 22, borderRadius: 2, backgroundColor: COLORS.mint },
  bottomNote: { marginTop: "auto", flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 13, backgroundColor: "rgba(94,234,212,0.08)" },
  noteTitle: { color: COLORS.mint, fontSize: 11, fontWeight: "800" },
  noteText: { color: COLORS.subtle, fontSize: 9, marginTop: 3 },
  version: { color: COLORS.subtle, fontSize: 9, marginTop: 15, paddingHorizontal: 3 },
  pressed: { opacity: 0.7 },
});
