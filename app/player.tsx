import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Cover, Icon, QualityBadge, TrackRow, styles as ui } from "@/components/mintune-ui";
import { COLORS, formatSeconds } from "@/lib/mintune-data";
import { currentLyricIndex, parseLrc } from "@/lib/lrc-parser";
import { usePlayer } from "@/lib/player-context";

export default function PlayerScreen() {
  const router = useRouter();
  const player = usePlayer();
  const [barWidth, setBarWidth] = useState(1);
  const [showQueue, setShowQueue] = useState(false);
  const lastSeekAt = useRef(0);
  const track = player.currentTrack;
  if (!track) return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background"><View style={styles.empty}><Icon name="music-off" size={42} color={COLORS.muted} /><Text style={styles.emptyTitle}>还没有正在播放的歌曲</Text><Text style={styles.emptyText}>先到音乐库扫描并导入设备音乐。</Text><Pressable onPress={() => router.back()} style={styles.emptyButton}><Text style={styles.emptyButtonText}>返回音乐库</Text></Pressable></View></ScreenContainer>;
  const lyricLines = parseLrc(track.lyrics ?? "");
  const activeLyric = currentLyricIndex(lyricLines, player.progress * track.durationSeconds * 1000);
  const currentIndex = player.tracks.findIndex((item) => item.id === track.id);
  const nextTrack = player.tracks.length ? player.tracks[(currentIndex + 1 + player.tracks.length) % player.tracks.length] : track;
  const handleSeek = (locationX: number, final = false) => { const now = Date.now(); if (!final && now - lastSeekAt.current < 80) return; lastSeekAt.current = now; player.seek(locationX / Math.max(barWidth, 1)); };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
    <View style={styles.content}>
      <View style={styles.topBar}><Pressable accessibilityLabel="关闭播放器" onPress={() => router.back()} style={({ pressed }) => [styles.topButton, pressed && ui.pressed]}><Icon name="keyboard-arrow-down" size={25} color={COLORS.text} /></Pressable><Text style={styles.topLabel}>正在播放</Text><Pressable accessibilityLabel="更多选项" onPress={() => Alert.alert("更多选项", "可查看专辑、艺人，或将歌曲添加到歌单。", [{ text: "知道了" }])} style={({ pressed }) => [styles.topButton, pressed && ui.pressed]}><Icon name="more-horiz" size={23} color={COLORS.text} /></Pressable></View>
      <View style={styles.artworkWrap}><View style={styles.artworkHalo} /><Cover track={track} size={282} radius={30} /></View>
      <View style={styles.trackHeader}><View style={styles.trackHeaderCopy}><Text numberOfLines={1} style={styles.title}>{track.title}</Text><Text numberOfLines={1} style={styles.artist}>{track.artist} · {track.album}</Text></View><Pressable accessibilityLabel={player.favorites.includes(track.id) ? "取消收藏" : "收藏"} onPress={() => player.toggleFavoriteTrack()} style={({ pressed }) => [styles.favorite, pressed && ui.pressed]}><Icon name={player.favorites.includes(track.id) ? "favorite" : "favorite-border"} size={23} color={COLORS.mint} /></Pressable></View>
      <View style={styles.metaRow}><QualityBadge quality={track.quality} /><Text style={styles.metaText}>{track.year} · {track.genre}</Text></View>
      <View onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onResponderMove={(event) => handleSeek(event.nativeEvent.locationX)} onResponderRelease={(event) => handleSeek(event.nativeEvent.locationX, true)} style={styles.progressPressable}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${player.progress * 100}%` }]} /><View style={[styles.progressThumb, { left: `${player.progress * 100}%` }]} /></View></View>
      <View style={styles.timeRow}><Text style={styles.timeText}>{formatSeconds(player.progress * track.durationSeconds)}</Text><Text style={styles.timeText}>-{formatSeconds((1 - player.progress) * track.durationSeconds)}</Text></View>
      <View style={styles.controls}><Pressable accessibilityLabel="上一首" onPress={player.previous} style={({ pressed }) => [styles.secondaryControl, pressed && ui.pressed]}><Icon name="skip-previous" size={27} color={COLORS.text} /></Pressable><Pressable accessibilityLabel={player.isPlaying ? "暂停" : "播放"} onPress={player.togglePlay} style={({ pressed }) => [styles.primaryControl, pressed && ui.pressed]}><Icon name={player.isPlaying ? "pause" : "play-arrow"} size={31} color={COLORS.background} /></Pressable><Pressable accessibilityLabel="下一首" onPress={player.next} style={({ pressed }) => [styles.secondaryControl, pressed && ui.pressed]}><Icon name="skip-next" size={27} color={COLORS.text} /></Pressable></View>
      <View style={styles.quickActions}><QuickAction icon="lyrics" label="歌词" onPress={() => router.push("/lyrics" as never)} /><QuickAction icon="equalizer" label="均衡器" onPress={() => router.push("/equalizer" as never)} /><QuickAction icon="queue-music" label={`队列 ${player.queue.length}`} onPress={() => setShowQueue(true)} /></View>
      <View style={styles.nextCard}><View style={styles.nextHeader}><Text style={styles.nextLabel}>接下来播放</Text><Text style={styles.nextMeta}>自动接续</Text></View><TrackRow track={nextTrack} compact /></View>
      <View style={styles.lyricHint}><Icon name="format-quote" size={17} color={COLORS.mint} /><Text numberOfLines={1} style={styles.lyricText}>{activeLyric >= 0 ? lyricLines[activeLyric]?.text : lyricLines.length ? lyricLines[0]?.text : "暂无歌词"}</Text></View>
    </View>
    <Modal visible={showQueue} animationType="slide" transparent onRequestClose={() => setShowQueue(false)}><View style={styles.queueBackdrop}><View style={styles.queueSheet}><View style={styles.queueHeader}><View><Text style={styles.queueTitle}>播放队列</Text><Text style={styles.queueSubtitle}>{player.queue.length} 首歌曲</Text></View><Pressable accessibilityLabel="关闭播放队列" onPress={() => setShowQueue(false)} style={styles.topButton}><Icon name="close" size={21} color={COLORS.text} /></Pressable></View><FlatList data={player.queue} keyExtractor={(item) => item.id} renderItem={({ item, index }) => <View style={[styles.queueRow, item.id === track.id && styles.queueRowActive]}><Cover track={item} size={44} radius={10} /><View style={styles.queueCopy}><Text numberOfLines={1} style={styles.queueTrackTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.queueTrackArtist}>{item.artist}</Text></View><Pressable accessibilityLabel="上移队列歌曲" disabled={index === 0} onPress={() => player.moveInQueue(index, index - 1)} style={styles.queueIcon}><Icon name="keyboard-arrow-up" size={20} color={index === 0 ? COLORS.subtle : COLORS.mint} /></Pressable><Pressable accessibilityLabel="下移队列歌曲" disabled={index === player.queue.length - 1} onPress={() => player.moveInQueue(index, index + 1)} style={styles.queueIcon}><Icon name="keyboard-arrow-down" size={20} color={index === player.queue.length - 1 ? COLORS.subtle : COLORS.mint} /></Pressable><Pressable accessibilityLabel="从队列移除" disabled={item.id === track.id} onPress={() => player.removeFromQueue(item.id)} style={styles.queueIcon}><Icon name="close" size={18} color={item.id === track.id ? COLORS.subtle : COLORS.muted} /></Pressable></View>} ListEmptyComponent={<Text style={styles.queueEmpty}>队列为空</Text>} /></View></View></Modal>
  </ScreenContainer>;
}

function QuickAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && ui.pressed]}><Icon name={icon} size={19} color={COLORS.mint} /><Text style={styles.quickLabel}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  topBar: { height: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  topLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  artworkWrap: { alignItems: "center", justifyContent: "center", marginVertical: 18 },
  artworkHalo: { position: "absolute", width: 292, height: 292, borderRadius: 146, backgroundColor: "rgba(94,234,212,0.10)" },
  trackHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  trackHeaderCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: "800", letterSpacing: -0.6 },
  artist: { color: COLORS.muted, fontSize: 13, marginTop: 5 },
  favorite: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 13 },
  metaText: { color: COLORS.subtle, fontSize: 11 },
  progressPressable: { paddingVertical: 13, marginTop: 10 },
  progressTrack: { height: 4, position: "relative", borderRadius: 3, backgroundColor: COLORS.divider },
  progressFill: { height: 4, borderRadius: 3, backgroundColor: COLORS.mint },
  progressThumb: { position: "absolute", top: -4, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: COLORS.mint },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { color: COLORS.subtle, fontSize: 10, fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 36, marginVertical: 14 },
  primaryControl: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.mint },
  secondaryControl: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickActions: { flexDirection: "row", justifyContent: "center", gap: 28, marginBottom: 13 },
  quickAction: { alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 5 },
  quickLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  nextCard: { padding: 13, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  nextHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  nextLabel: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  nextMeta: { color: COLORS.subtle, fontSize: 10 },
  lyricHint: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingHorizontal: 4 },
  lyricText: { flex: 1, color: COLORS.muted, fontSize: 11, fontStyle: "italic" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800", marginTop: 16 },
  emptyText: { color: COLORS.muted, fontSize: 13, marginTop: 8, textAlign: "center" },
  emptyButton: { marginTop: 22, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, backgroundColor: COLORS.mint },
  emptyButtonText: { color: COLORS.background, fontWeight: "800", fontSize: 13 },
  queueBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  queueSheet: { maxHeight: "78%", padding: 20, paddingBottom: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: COLORS.background },
  queueHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  queueTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
  queueSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  queueRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 8, borderRadius: 14 },
  queueRowActive: { backgroundColor: COLORS.surface },
  queueCopy: { flex: 1 },
  queueTrackTitle: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  queueTrackArtist: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  queueIcon: { width: 28, height: 32, alignItems: "center", justifyContent: "center" },
  queueEmpty: { color: COLORS.muted, textAlign: "center", paddingVertical: 40 },
});
