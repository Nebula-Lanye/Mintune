import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Cover, Icon, MiniPlayer, SectionTitle, TrackRow, styles as ui } from "@/components/mintune-ui";
import { COLORS } from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";

export default function HomeScreen() {
  const router = useRouter();
  const player = usePlayer();
  const featured = player.tracks[0];
  const recent = player.tracks.slice(0, 4);

  return <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>M</Text></View><View><Text style={styles.brandName}>MINTUNE</Text><Text style={styles.brandTagline}>softly in tune</Text></View></View>
        <Pressable accessibilityLabel="打开设置" onPress={() => router.push("/(tabs)/settings" as never)} style={({ pressed }) => [styles.iconButton, pressed && ui.pressed]}><Icon name="settings" size={20} color={COLORS.muted} /></Pressable>
      </View>

      <View style={styles.greeting}><Text style={styles.eyebrow}>THURSDAY · 17 SEP</Text><Text style={styles.greetingTitle}>晚上好，Lanye</Text><Text style={styles.greetingSubtitle}>让今天的声音慢一点。</Text></View>

      {featured ? <Pressable onPress={() => { player.playTrack(featured); router.push("/player" as never); }} style={({ pressed }) => [styles.heroCard, pressed && ui.pressed]}>
        <View style={styles.heroCopy}><View style={styles.heroPill}><View style={styles.heroDot} /><Text style={styles.heroPillText}>为你推荐</Text></View><Text style={styles.heroTitle}>夜色刚刚好</Text><Text style={styles.heroDescription}>低饱和的旋律，适合一个人慢慢走。</Text><View style={styles.heroAction}><Text style={styles.heroActionText}>立即播放</Text><Icon name="play-arrow" size={18} color={COLORS.background} /></View></View>
        <View style={styles.heroArt}><Cover track={featured} size={156} radius={24} /><View style={styles.artGlow} /></View>
      </Pressable> : null}

      <View style={styles.statsRow}><Stat label="本周聆听" value="4h 32m" meta="比上周多 18%" icon="headphones" /><Stat label="收藏歌曲" value="24" meta="保持你的节奏" icon="favorite" /></View>

      <SectionTitle title="继续聆听" action="查看全部" onAction={() => router.push("/(tabs)/library" as never)} />
      <View style={styles.trackList}>{recent.map((track, index) => <TrackRow key={track.id} track={track} index={index} compact />)}</View>

      <SectionTitle title="我的歌单" action="管理" onAction={() => router.push("/(tabs)/playlists" as never)} />
      <FlatList data={player.playlists} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id} contentContainerStyle={styles.playlistList} renderItem={({ item }) => <PlaylistCard playlist={item} onPress={() => { const track = player.getPlaylistTracks(item.id)[0]; if (track) { player.playTrack(track); router.push("/player" as never); } }} />} />

      <View style={styles.noteCard}><Icon name="offline-pin" size={18} color={COLORS.mint} /><View style={styles.noteCopy}><Text style={styles.noteTitle}>本地优先 · 无广告</Text><Text style={styles.noteText}>音乐和播放记录只保存在这台设备上。</Text></View><Icon name="chevron-right" size={18} color={COLORS.subtle} /></View>
      <MiniPlayer />
    </ScrollView>
  </ScreenContainer>;
}

function Stat({ label, value, meta, icon }: { label: string; value: string; meta: string; icon: "headphones" | "favorite" }) {
  return <View style={styles.statCard}><View style={styles.statTop}><Text style={styles.statLabel}>{label}</Text><Icon name={icon} size={17} color={COLORS.mint} /></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statMeta}>{meta}</Text></View>;
}

function PlaylistCard({ playlist, onPress }: { playlist: { id: string; name: string; count: number; tone: string; icon: string }; onPress: () => void }) {
  const player = usePlayer();
  const track = player.getPlaylistTracks(playlist.id)[0];
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.playlistCard, { backgroundColor: playlist.tone }, pressed && ui.pressed]}><View style={styles.playlistIcon}><Icon name={playlist.icon as React.ComponentProps<typeof Icon>["name"]} size={20} color={COLORS.background} /></View><View style={styles.playlistArt}>{track ? <Cover track={track} size={82} radius={18} /> : null}</View><Text style={styles.playlistName}>{playlist.name}</Text><Text style={styles.playlistMeta}>{playlist.count} 首歌</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 132, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.mint },
  brandMarkText: { color: COLORS.background, fontSize: 19, fontWeight: "900" },
  brandName: { color: COLORS.text, fontSize: 12, fontWeight: "900", letterSpacing: 2.2 },
  brandTagline: { color: COLORS.muted, fontSize: 9, marginTop: 2, letterSpacing: 0.5 },
  iconButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: COLORS.surface },
  greeting: { gap: 4, marginTop: 9 },
  eyebrow: { color: COLORS.mint, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  greetingTitle: { color: COLORS.text, fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.7 },
  greetingSubtitle: { color: COLORS.muted, fontSize: 14 },
  heroCard: { minHeight: 222, overflow: "hidden", flexDirection: "row", borderRadius: 26, padding: 20, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.divider },
  heroCopy: { flex: 1, zIndex: 2, justifyContent: "space-between" },
  heroPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(183,231,200,0.14)" },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.mint },
  heroPillText: { color: COLORS.mint, fontSize: 10, fontWeight: "800" },
  heroTitle: { color: COLORS.text, fontSize: 27, fontWeight: "800", letterSpacing: -0.8, marginTop: 20 },
  heroDescription: { maxWidth: 170, color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  heroAction: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, marginTop: 17, backgroundColor: COLORS.mint },
  heroActionText: { color: COLORS.background, fontSize: 12, fontWeight: "800" },
  heroArt: { width: 155, alignItems: "center", justifyContent: "center", marginRight: -10 },
  artGlow: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(183,231,200,0.10)", transform: [{ scale: 1.15 }], zIndex: -1 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, minHeight: 98, padding: 14, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  statTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  statValue: { color: COLORS.text, fontSize: 22, fontWeight: "800", marginTop: 10 },
  statMeta: { color: COLORS.subtle, fontSize: 10, marginTop: 2 },
  trackList: { marginTop: -6 },
  playlistList: { gap: 11, paddingRight: 14 },
  playlistCard: { width: 143, height: 155, borderRadius: 20, padding: 13, overflow: "hidden" },
  playlistIcon: { position: "absolute", right: 12, top: 12, width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(16,36,29,0.15)" },
  playlistArt: { alignItems: "flex-start", marginTop: 24 },
  playlistName: { color: COLORS.background, fontSize: 14, fontWeight: "900", marginTop: 9 },
  playlistMeta: { color: "rgba(16,36,29,0.65)", fontSize: 10, fontWeight: "700", marginTop: 3 },
  noteCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15, borderRadius: 17, backgroundColor: "rgba(183,231,200,0.08)", borderWidth: 1, borderColor: "rgba(183,231,200,0.18)" },
  noteCopy: { flex: 1 },
  noteTitle: { color: COLORS.mint, fontSize: 12, fontWeight: "800" },
  noteText: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
});
