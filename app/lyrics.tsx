import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Cover, Icon, styles as ui } from "@/components/mintune-ui";
import { COLORS, LYRICS } from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";

export default function LyricsScreen() {
  const router = useRouter();
  const player = usePlayer();
  const active = Math.min(LYRICS.length - 1, Math.floor(player.progress * LYRICS.length));
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background"><View style={styles.content}>
    <View style={styles.topBar}><Pressable accessibilityLabel="返回播放器" onPress={() => router.back()} style={({ pressed }) => [styles.topButton, pressed && ui.pressed]}><Icon name="arrow-back" size={22} color={COLORS.text} /></Pressable><Text style={styles.topTitle}>歌词</Text><Pressable accessibilityLabel="关闭歌词" onPress={() => router.dismiss()} style={({ pressed }) => [styles.topButton, pressed && ui.pressed]}><Icon name="close" size={22} color={COLORS.text} /></Pressable></View>
    <View style={styles.trackCard}><Cover track={player.currentTrack} size={48} radius={13} /><View style={styles.trackCopy}><Text style={styles.trackTitle}>{player.currentTrack.title}</Text><Text style={styles.trackArtist}>{player.currentTrack.artist} · {player.currentTrack.album}</Text></View><Icon name="volume-up" size={20} color={COLORS.mint} /></View>
    <ScrollView contentContainerStyle={styles.lyrics} showsVerticalScrollIndicator={false}>{LYRICS.map((line, index) => <Text key={`${line}-${index}`} style={[styles.line, index === active && styles.activeLine]}>{line}</Text>)}</ScrollView>
    <View style={styles.bottomHint}><Icon name="music-note" size={16} color={COLORS.mint} /><Text style={styles.bottomText}>歌词会随播放进度自动滚动</Text></View>
  </View></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  topBar: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  topTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  trackCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, marginTop: 15, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  trackCopy: { flex: 1 },
  trackTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  trackArtist: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  lyrics: { paddingVertical: 36, gap: 23 },
  line: { color: COLORS.subtle, fontSize: 25, lineHeight: 33, fontWeight: "700", opacity: 0.62 },
  activeLine: { color: COLORS.mint, opacity: 1, transform: [{ scale: 1.02 }] },
  bottomHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13 },
  bottomText: { color: COLORS.subtle, fontSize: 10 },
});
