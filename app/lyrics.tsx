import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Cover, Icon, styles as ui } from "@/components/mintune-ui";
import { COLORS } from "@/lib/mintune-data";
import { currentLyricIndex, parseLrc } from "@/lib/lrc-parser";
import { usePlayer } from "@/lib/player-context";

export default function LyricsScreen() {
  const router = useRouter();
  const player = usePlayer();
  const scrollRef = useRef<ScrollView>(null);
  const track = player.currentTrack;
  const lines = parseLrc(track?.lyrics ?? "");
  const active = track ? currentLyricIndex(lines, player.progress * track.durationSeconds * 1000) : -1;
  useEffect(() => {
    if (active < 0 || !lines.length) return;
    const lineHeight = 56;
    const target = Math.max(0, active * lineHeight - 150);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: target, animated: true }));
  }, [active, lines.length]);
  if (!track) return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background"><View style={styles.empty}><Icon name="music-off" size={42} color={COLORS.muted} /><Text style={styles.emptyTitle}>暂无歌词</Text><Text style={styles.emptyText}>导入歌曲后，歌词会显示在这里。</Text></View></ScreenContainer>;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background"><View style={styles.content}>
    <View style={styles.topBar}><Pressable accessibilityLabel="返回播放器" onPress={() => router.back()} style={({ pressed }) => [styles.topButton, pressed && ui.pressed]}><Icon name="arrow-back" size={22} color={COLORS.text} /></Pressable><Text style={styles.topTitle}>歌词</Text><Pressable accessibilityLabel="关闭歌词" onPress={() => router.dismiss()} style={({ pressed }) => [styles.topButton, pressed && ui.pressed]}><Icon name="close" size={22} color={COLORS.text} /></Pressable></View>
    <View style={styles.trackCard}><Cover track={track} size={48} radius={13} /><View style={styles.trackCopy}><Text style={styles.trackTitle}>{track.title}</Text><Text style={styles.trackArtist}>{track.artist} · {track.album}</Text></View><Icon name="volume-up" size={20} color={COLORS.mint} /></View>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.lyrics} showsVerticalScrollIndicator={false}>{lines.length ? lines.map((line, index) => <Text key={`${line.timestampMs}-${index}`} style={[styles.line, index === active && styles.activeLine]}>{line.text}</Text>) : <View style={styles.noLyrics}><Icon name="lyrics" size={28} color={COLORS.muted} /><Text style={styles.noLyricsText}>暂无歌词</Text><Text style={styles.noLyricsHint}>可将同名 .lrc 文件放在音频文件旁边</Text></View>}</ScrollView>
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800", marginTop: 16 },
  emptyText: { color: COLORS.muted, fontSize: 13, marginTop: 8 },
  noLyrics: { alignItems: "center", paddingTop: 90 },
  noLyricsText: { color: COLORS.muted, fontSize: 16, fontWeight: "700", marginTop: 12 },
  noLyricsHint: { color: COLORS.subtle, fontSize: 11, marginTop: 6 },
});
