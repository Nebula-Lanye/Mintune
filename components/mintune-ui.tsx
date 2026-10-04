import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState, type ComponentProps } from "react";
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, type GestureResponderEvent, type ImageStyle, type StyleProp } from "react-native";
import { useRouter } from "expo-router";
import { COLORS, Track, getQualityColor, getTrackMeta } from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";
import { getPlaybackAction } from "@/lib/player-logic";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function Icon({ name, size = 22, color = COLORS.text }: { name: IconName; size?: number; color?: string }) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

export function Cover({ track, size = 58, radius = 14, style }: { track: Track; size?: number; radius?: number; style?: StyleProp<ImageStyle> }) {
  const fallback = require("@/assets/images/mintune-icon.png");
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [track.coverUri]);
  const source = failed || track.coverUri === "mintune-local" ? fallback : { uri: track.coverUri };
  return <Image accessibilityLabel={`${track.title} / ${track.artist} 专辑封面`} source={source} defaultSource={fallback} onError={() => setFailed(true)} style={[{ width: size, height: size, borderRadius: radius, backgroundColor: COLORS.surfaceAlt }, style]} />;
}

export function QualityBadge({ quality }: { quality: Track["quality"] }) {
  return <View style={[styles.qualityBadge, { borderColor: getQualityColor(quality) }]}><Text style={[styles.qualityText, { color: getQualityColor(quality) }]}>{quality}</Text></View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionTitleText}>{title}</Text>{action ? <Pressable onPress={onAction} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}><Text style={styles.smallActionText}>{action}</Text><Icon name="arrow-forward" size={16} color={COLORS.mint} /></Pressable> : null}</View>;
}

export function TrackRow({ track, index, compact = false, onPress, onLongPress }: { track: Track; index?: number; compact?: boolean; onPress?: (track: Track) => void; onLongPress?: () => void }) {
  const router = useRouter();
  const player = usePlayer();
  const [actionsVisible, setActionsVisible] = useState(false);
  const isActive = player.currentTrack?.id === track.id;
  const handlePress = () => {
    if (onPress) onPress(track);
    else if (getPlaybackAction(player.currentTrack?.id, track.id, player.isPlaying) !== "play-new") player.togglePlay();
    else player.playTrack(track);
  };
  return <Pressable accessibilityLabel={`播放 ${track.title}`} onPress={handlePress} onLongPress={onLongPress} style={({ pressed }) => [styles.trackRow, compact && styles.trackRowCompact, pressed && styles.pressed]}>
    {typeof index === "number" ? <Text style={styles.trackIndex}>{String(index + 1).padStart(2, "0")}</Text> : null}
    <Cover track={track} size={compact ? 48 : 54} radius={compact ? 12 : 14} />
    <View style={styles.trackInfo}>
      <View style={styles.trackTitleLine}><Text numberOfLines={1} style={[styles.trackTitle, isActive && styles.activeText]}>{track.title}</Text>{isActive && player.isPlaying ? <View style={styles.playingDot} /> : null}</View>
      <Text numberOfLines={1} style={styles.trackSubtitle}>{getTrackMeta(track)}</Text>
    </View>
    {!compact ? <QualityBadge quality={track.quality} /> : null}
    <Text style={styles.trackDuration}>{track.duration}</Text>
    <Pressable accessibilityLabel={`打开 ${track.title} 操作`} onPress={(event: GestureResponderEvent) => { event.stopPropagation(); setActionsVisible(true); }} style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}><Icon name="more-horiz" size={20} color={COLORS.muted} /></Pressable>
    <Modal transparent visible={actionsVisible} animationType="slide" onRequestClose={() => setActionsVisible(false)}><View style={styles.dialogBackdrop}><View style={styles.actionCard}><Text style={styles.dialogTitle}>{track.title}</Text><Text style={styles.dialogMessage}>{track.artist} · {track.album}</Text><Pressable onPress={() => { player.toggleFavoriteTrack(track.id); setActionsVisible(false); }} style={styles.actionRow}><Icon name="favorite" size={19} color={COLORS.mint} /><Text style={styles.actionText}>{player.favorites.includes(track.id) ? "取消收藏" : "收藏歌曲"}</Text></Pressable>{player.playlists.map((playlist) => <Pressable key={playlist.id} onPress={() => { player.addTrackToPlaylist(playlist.id, track.id); setActionsVisible(false); }} style={styles.actionRow}><Icon name="playlist-add" size={19} color={COLORS.mint} /><Text style={styles.actionText}>添加到「{playlist.name}」</Text></Pressable>)}<Pressable onPress={() => { player.playTrack(track); router.push("/player" as never); setActionsVisible(false); }} style={styles.actionRow}><Icon name="open-in-new" size={19} color={COLORS.mint} /><Text style={styles.actionText}>打开播放器</Text></Pressable><Pressable onPress={() => setActionsVisible(false)} style={[styles.dialogAction, { backgroundColor: COLORS.surfaceAlt }]}><Text style={[styles.dialogActionText, { color: COLORS.text }]}>取消</Text></Pressable></View></View></Modal>
  </Pressable>;
}

export function MiniPlayer({ floating = false, bottomOffset = 0 }: { floating?: boolean; bottomOffset?: number }) {
  const player = usePlayer();
  if (!player.currentTrack) return null;
  return <Pressable onPress={player.openPlayer} style={({ pressed }) => [styles.miniPlayer, floating && styles.miniPlayerFloating, floating && { bottom: bottomOffset }, pressed && styles.pressed]}>
    <Cover track={player.currentTrack} size={48} radius={12} />
    <View style={styles.miniInfo}><Text numberOfLines={1} style={styles.miniTitle}>{player.currentTrack.title}</Text><Text numberOfLines={1} style={styles.miniArtist}>{player.currentTrack.artist} · {player.currentTrack.quality}</Text></View>
    <Pressable accessibilityLabel={player.isPlaying ? "暂停" : "播放"} onPress={(event) => { event.stopPropagation(); player.togglePlay(); }} style={({ pressed }) => [styles.miniPlay, pressed && styles.pressed]}><Icon name={player.isPlaying ? "pause" : "play-arrow"} size={22} color={COLORS.background} /></Pressable>
    <Pressable accessibilityLabel="下一首" onPress={(event) => { event.stopPropagation(); player.next(); }} style={({ pressed }) => [styles.miniNext, pressed && styles.pressed]}><Icon name="skip-next" size={22} color={COLORS.mint} /></Pressable>
  </Pressable>;
}

export function SearchBar({ value, onChangeText, placeholder = "搜索歌曲、艺人或专辑" }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return <View style={styles.searchBar}><Icon name="search" size={21} color={COLORS.muted} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.subtle} returnKeyType="search" style={styles.searchInput} /></View>;
}

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [progress]);
  return <Animated.View style={[styles.pageHeader, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}><View style={styles.pageHeaderCopy}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.pageTitle}>{title}</Text>{subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}</View>{right}</Animated.View>;
}

export function AppDialog({ visible, title, message, action = "知道了", onClose }: { visible: boolean; title: string; message: string; action?: string; onClose: () => void }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={styles.dialogBackdrop}><View style={styles.dialogCard}><Text style={styles.dialogTitle}>{title}</Text><Text style={styles.dialogMessage}>{message}</Text><Pressable onPress={onClose} style={({ pressed }) => [styles.dialogAction, pressed && styles.pressed]}><Text style={styles.dialogActionText}>{action}</Text></Pressable></View></View></Modal>;
}

export function ScanProgressModal({ visible, progress, recentTracks, onClose }: { visible: boolean; progress: { phase: "preparing" | "scanning" | "completed"; current: number; total: number; filename?: string; path?: string }; recentTracks: Track[]; onClose: () => void }) {
  const ratio = progress.total ? Math.min(1, progress.current / progress.total) : 0;
  const scanning = progress.phase !== "completed";
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={styles.dialogBackdrop}><View style={styles.scanCard}><View style={styles.scanHeader}><View><Text style={styles.dialogTitle}>{scanning ? "正在扫描音乐" : "扫描完成"}</Text><Text style={styles.scanCount}>{progress.current} / {progress.total || "—"} 首</Text></View><Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><Icon name="close" size={20} color={COLORS.muted} /></Pressable></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} /></View><Text numberOfLines={1} style={styles.scanPath}>{progress.path || (scanning ? "正在读取设备媒体库…" : "已完成全部扫描")}</Text><Text style={styles.scanHint}>{scanning ? "扫描会分批进行，结果会实时写入音乐库。" : `已发现 ${progress.current} 首歌曲。`}</Text><View style={styles.scanList}>{recentTracks.slice(-6).reverse().map((track) => <View key={track.id} style={styles.scanItem}><Cover track={track} size={34} radius={8} /><View style={styles.scanItemCopy}><Text numberOfLines={1} style={styles.scanItemTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.scanItemMeta}>{track.artist} · {track.album}</Text></View><Icon name="check-circle" size={17} color={COLORS.mint} /></View>)}</View><Pressable onPress={onClose} style={({ pressed }) => [styles.dialogAction, pressed && styles.pressed]}><Text style={styles.dialogActionText}>{scanning ? "后台继续" : "完成"}</Text></Pressable></View></View></Modal>;
}

export const styles = StyleSheet.create({
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  qualityBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, marginRight: 9 },
  qualityText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitleText: { color: COLORS.text, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  smallAction: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 5 },
  smallActionText: { color: COLORS.mint, fontSize: 12, fontWeight: "700" },
  trackRow: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  trackRowCompact: { borderBottomWidth: 0, paddingVertical: 7 },
  trackIndex: { width: 24, color: COLORS.subtle, fontSize: 11, fontWeight: "700", textAlign: "center" },
  trackInfo: { flex: 1, minWidth: 0 },
  trackTitleLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  trackTitle: { flexShrink: 1, color: COLORS.text, fontSize: 14, fontWeight: "700" },
  activeText: { color: COLORS.mint },
  playingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.mint },
  trackSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  trackDuration: { color: COLORS.subtle, fontSize: 11, minWidth: 34, textAlign: "right" },
  moreButton: { width: 30, height: 34, alignItems: "center", justifyContent: "center" },
  miniPlayer: { minHeight: 70, marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.divider },
  miniInfo: { flex: 1, minWidth: 0 },
  miniTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  miniArtist: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  miniPlay: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: COLORS.mint },
  miniNext: { width: 30, height: 34, alignItems: "center", justifyContent: "center" },
  miniPlayerFloating: { position: "absolute", left: 14, right: 14, bottom: 0, marginHorizontal: 0, marginBottom: 0, zIndex: 20 },
  searchBar: { height: 50, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 15, paddingHorizontal: 15, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 0 },
  pageHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 },
  pageHeaderCopy: { flex: 1 },
  eyebrow: { color: COLORS.mint, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" },
  pageTitle: { color: COLORS.text, fontSize: 31, lineHeight: 37, fontWeight: "800", letterSpacing: -0.8 },
  pageSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  dialogBackdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.62)" },
  dialogCard: { borderRadius: 24, padding: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  dialogTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
  dialogMessage: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 12 },
  dialogAction: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 15, marginTop: 18, backgroundColor: COLORS.mint },
  dialogActionText: { color: COLORS.background, fontSize: 14, fontWeight: "800" },
  scanCard: { maxHeight: "82%", borderRadius: 25, padding: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  scanHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  scanCount: { color: COLORS.mint, fontSize: 13, fontWeight: "800", marginTop: 6 },
  closeButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: COLORS.surfaceAlt },
  progressTrack: { height: 8, overflow: "hidden", borderRadius: 4, marginTop: 18, backgroundColor: COLORS.surfaceAlt },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.mint },
  scanPath: { color: COLORS.text, fontSize: 11, marginTop: 12 },
  scanHint: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 6 },
  scanList: { minHeight: 120, maxHeight: 330, marginTop: 14 },
  scanItem: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  scanItemCopy: { flex: 1, minWidth: 0 },
  scanItemTitle: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  scanItemMeta: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
  actionCard: { borderRadius: 25, padding: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  actionRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  actionText: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
});
