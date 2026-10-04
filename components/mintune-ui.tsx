import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState, type ComponentProps } from "react";
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, type GestureResponderEvent, type ImageStyle, type StyleProp } from "react-native";
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
  const player = usePlayer();
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
    <Pressable accessibilityLabel={`打开 ${track.title} 操作`} onPress={(event: GestureResponderEvent) => { event.stopPropagation(); }} style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}><Icon name="more-horiz" size={20} color={COLORS.muted} /></Pressable>
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
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(value, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [value]);
  return <Animated.View style={[styles.pageHeader, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}><View style={styles.pageHeaderCopy}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.pageTitle}>{title}</Text>{subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}</View>{right}</Animated.View>;
}

export function AppDialog({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) { scale.setValue(0.92); opacity.setValue(0); Animated.parallel([Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 220, mass: 0.7, useNativeDriver: true }), Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true })]).start(); } }, [visible, opacity, scale]);
  return <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}><View style={styles.dialogBackdrop}><Animated.View style={[styles.glassDialog, { opacity, transform: [{ scale }] }]}><View style={styles.glassHighlight} /><Text style={styles.dialogTitle}>{title}</Text><Text style={styles.dialogMessage}>{message}</Text><Pressable onPress={onClose} style={({ pressed }) => [styles.dialogButton, pressed && styles.pressed]}><Text style={styles.dialogButtonText}>好的</Text></Pressable></Animated.View></View></Modal>;
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
  dialogBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "rgba(2,8,18,0.72)" },
  glassDialog: { width: "100%", overflow: "hidden", borderRadius: 28, padding: 23, backgroundColor: "rgba(24,49,76,0.93)", borderWidth: 1, borderColor: "rgba(188,255,246,0.26)", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 18 },
  glassHighlight: { position: "absolute", top: 0, left: 20, right: 20, height: 1, backgroundColor: "rgba(255,255,255,0.55)" },
  dialogTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
  dialogMessage: { color: COLORS.muted, fontSize: 13, lineHeight: 21, marginTop: 12 },
  dialogButton: { height: 46, alignItems: "center", justifyContent: "center", marginTop: 20, borderRadius: 16, backgroundColor: COLORS.mint },
  dialogButtonText: { color: COLORS.background, fontSize: 14, fontWeight: "800" },
});
