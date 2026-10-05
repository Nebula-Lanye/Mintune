import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { useRouter } from "expo-router";
import {
  COLORS,
  Track,
  getQualityColor,
  getTrackMeta,
} from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";
import { getPlaybackAction } from "@/lib/player-logic";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function Icon({
  name,
  size = 22,
  color = COLORS.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

export function Cover({
  track,
  size = 58,
  radius = 14,
  style,
}: {
  track: Track;
  size?: number;
  radius?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const fallback = require("@/assets/images/mintune-icon.png");
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [track.id, track.coverUri]);
  const coverUri = track.coverUri.startsWith("/")
    ? `file://${track.coverUri}`
    : track.coverUri;
  const source =
    failed || track.coverUri === "mintune-local" ? fallback : { uri: coverUri };
  return (
    <Image
      accessibilityLabel={`${track.title} / ${track.artist} 专辑封面`}
      source={source}
      defaultSource={fallback}
      onLoad={() => setFailed(false)}
      onError={() => setFailed(true)}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: COLORS.surfaceAlt,
        },
        style,
      ]}
    />
  );
}

export function QualityBadge({ quality }: { quality: Track["quality"] }) {
  return (
    <View
      style={[styles.qualityBadge, { borderColor: getQualityColor(quality) }]}
    >
      <Text style={[styles.qualityText, { color: getQualityColor(quality) }]}>
        {quality}
      </Text>
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {action ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.smallAction,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.smallActionText}>{action}</Text>
          <Icon name="arrow-forward" size={16} color={COLORS.mint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function TrackRow({
  track,
  index,
  compact = false,
  onPress,
  onLongPress,
}: {
  track: Track;
  index?: number;
  compact?: boolean;
  onPress?: (track: Track) => void;
  onLongPress?: () => void;
}) {
  const router = useRouter();
  const player = usePlayer();
  const [showActions, setShowActions] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const isActive = player.currentTrack?.id === track.id;
  const handlePress = () => {
    if (onPress) onPress(track);
    else if (
      getPlaybackAction(player.currentTrack?.id, track.id, player.isPlaying) !==
      "play-new"
    )
      player.togglePlay();
    else player.playTrack(track);
  };
  return (
    <Pressable
      accessibilityLabel={`播放 ${track.title}`}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.trackRow,
        compact && styles.trackRowCompact,
        pressed && styles.pressed,
      ]}
    >
      {typeof index === "number" ? (
        <Text style={styles.trackIndex}>
          {String(index + 1).padStart(2, "0")}
        </Text>
      ) : null}
      <Cover
        track={track}
        size={compact ? 48 : 54}
        radius={compact ? 12 : 14}
      />
      <View style={styles.trackInfo}>
        <View style={styles.trackTitleLine}>
          <Text
            numberOfLines={1}
            style={[styles.trackTitle, isActive && styles.activeText]}
          >
            {track.title}
          </Text>
          {isActive && player.isPlaying ? (
            <View style={styles.playingDot} />
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.trackSubtitle}>
          {getTrackMeta(track)}
        </Text>
      </View>
      {!compact ? <QualityBadge quality={track.quality} /> : null}
      <Text style={styles.trackDuration}>{track.duration}</Text>
      <Pressable
        accessibilityLabel={`打开 ${track.title} 操作`}
        onPress={(event: GestureResponderEvent) => {
          event.stopPropagation();
          setShowActions(true);
        }}
        style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
      >
        <Icon name="more-horiz" size={20} color={COLORS.muted} />
      </Pressable>
      <ActionSheet
        visible={showActions}
        title={track.title}
        onClose={() => setShowActions(false)}
        items={[
          {
            label: player.favorites.includes(track.id) ? "取消收藏" : "收藏",
            icon: player.favorites.includes(track.id)
              ? "favorite"
              : "favorite-border",
            onPress: () => player.toggleFavoriteTrack(track.id),
          },
          {
            label: "添加到歌单",
            icon: "playlist-add",
            onPress: () => setShowPlaylistPicker(true),
          },
          {
            label: "打开播放器",
            icon: "play-circle-outline",
            onPress: () => {
              player.playTrack(track);
              router.push("/player" as never);
            },
          },
        ]}
      />
      <ActionSheet
        visible={showPlaylistPicker}
        title="选择歌单"
        onClose={() => setShowPlaylistPicker(false)}
        items={player.playlists.map((playlist) => ({
          label: playlist.name,
          icon: "queue-music" as IconName,
          onPress: () => player.addTrackToPlaylist(playlist.id, track.id),
        }))}
      />
    </Pressable>
  );
}

export function MiniPlayer({
  floating = false,
  bottomOffset = 0,
  desktop = false,
}: {
  floating?: boolean;
  bottomOffset?: number;
  desktop?: boolean;
}) {
  const player = usePlayer();
  if (!player.currentTrack) return null;
  return (
    <Pressable
      onPress={player.openPlayer}
      style={({ pressed }) => [
        styles.miniPlayer,
        floating && styles.miniPlayerFloating,
        desktop && styles.miniPlayerDesktop,
        floating && { bottom: bottomOffset },
        pressed && styles.pressed,
      ]}
    >
      <Cover track={player.currentTrack} size={48} radius={12} />
      <View style={styles.miniInfo}>
        <Text numberOfLines={1} style={styles.miniTitle}>
          {player.currentTrack.title}
        </Text>
        <Text numberOfLines={1} style={styles.miniArtist}>
          {player.currentTrack.artist} · {player.currentTrack.quality}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={player.isPlaying ? "暂停" : "播放"}
        onPress={(event) => {
          event.stopPropagation();
          player.togglePlay();
        }}
        style={({ pressed }) => [styles.miniPlay, pressed && styles.pressed]}
      >
        <Icon
          name={player.isPlaying ? "pause" : "play-arrow"}
          size={22}
          color={COLORS.background}
        />
      </Pressable>
      <Pressable
        accessibilityLabel="下一首"
        onPress={(event) => {
          event.stopPropagation();
          player.next();
        }}
        style={({ pressed }) => [styles.miniNext, pressed && styles.pressed]}
      >
        <Icon name="skip-next" size={22} color={COLORS.mint} />
      </Pressable>
    </Pressable>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "搜索歌曲、艺人或专辑",
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.searchBar}>
      <Icon name="search" size={21} color={COLORS.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.subtle}
        returnKeyType="search"
        style={styles.searchInput}
      />
    </View>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [value]);
  return (
    <Animated.View
      style={[
        styles.pageHeader,
        {
          opacity: value,
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.pageHeaderCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </Animated.View>
  );
}

export function AppDialog({
  visible,
  title,
  message,
  onClose,
  actionLabel = "知道了",
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
}) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    backdrop.setValue(0);
    card.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(card, {
        toValue: 1,
        damping: 16,
        stiffness: 190,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdrop, card, visible]);
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.dialogBackdrop, { opacity: backdrop }]}>
        <Animated.View
          style={[
            styles.dialogCard,
            {
              opacity: card,
              transform: [
                {
                  translateY: card.interpolate({
                    inputRange: [0, 1],
                    outputRange: [42, 0],
                  }),
                },
                {
                  scale: card.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.88, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.dialogGlow}>
            <Icon name="auto-awesome" size={22} color={COLORS.mint} />
          </View>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onClose}
            style={({ pressed }) => [
              styles.dialogButton,
              pressed && styles.dialogButtonPressed,
            ]}
          >
            <Text style={styles.dialogButtonText}>{actionLabel}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export type ActionSheetItem = {
  label: string;
  icon: IconName;
  onPress: () => void;
  danger?: boolean;
};
export function ActionSheet({
  visible,
  title,
  items,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: ActionSheetItem[];
  onClose: () => void;
}) {
  const backdrop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    backdrop.setValue(0);
    Animated.timing(backdrop, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [backdrop, visible]);
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.actionBackdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.actionSheet,
            {
              transform: [
                {
                  translateY: backdrop.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.actionHandle} />
          <Text style={styles.actionTitle}>{title}</Text>
          {items.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.actionItem,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.actionIcon,
                  item.danger && styles.actionDangerIcon,
                ]}
              >
                <Icon
                  name={item.icon}
                  size={19}
                  color={item.danger ? "#F87171" : COLORS.mint}
                />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  item.danger && styles.actionDangerLabel,
                ]}
              >
                {item.label}
              </Text>
              <Icon name="chevron-right" size={18} color={COLORS.subtle} />
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.actionCancel,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.actionCancelText}>取消</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
export function ScanProgressModal({
  visible,
  current,
  total,
  filename,
  recent,
  onClose,
}: {
  visible: boolean;
  current: number;
  total: number;
  filename: string;
  recent: string[];
  onClose: () => void;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, visible]);
  const progress = total ? Math.min(1, current / total) : 0;
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.scanBackdrop}>
        <View style={styles.scanCard}>
          <View style={styles.scanHeading}>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: spin.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
            >
              <Icon name="sync" size={27} color={COLORS.mint} />
            </Animated.View>
            <View style={styles.scanHeadingCopy}>
              <Text style={styles.scanTitle}>扫描音乐</Text>
              <Text style={styles.scanSubtitle}>
                {current >= total && total > 0
                  ? "扫描完成"
                  : "正在读取设备媒体库"}
              </Text>
            </View>
          </View>
          <View style={styles.scanTrack}>
            <Animated.View
              style={[styles.scanFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <View style={styles.scanStats}>
            <Text style={styles.scanCount}>
              {current} / {total || "…"} 首歌曲
            </Text>
            <Text style={styles.scanPercent}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.scanPath}>
            {filename || "准备扫描…"}
          </Text>
          <Text style={styles.scanRecentTitle}>最近发现</Text>
          <View style={styles.scanRecent}>
            {recent.length ? (
              recent
                .slice(-6)
                .reverse()
                .map((item, index) => (
                  <Text
                    key={`${item}-${index}`}
                    numberOfLines={1}
                    style={styles.scanRecentItem}
                  >
                    {item}
                  </Text>
                ))
            ) : (
              <Text style={styles.scanEmpty}>等待读取音频文件…</Text>
            )}
          </View>
          <Pressable
            onPress={onClose}
            disabled={current < total && total > 0}
            style={({ pressed }) => [
              styles.scanButton,
              current < total && total > 0 && styles.scanDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.scanButtonText}>
              {current >= total && total > 0 ? "完成" : "扫描中"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  qualityBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 9,
  },
  qualityText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleText: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  smallAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 5,
  },
  smallActionText: { color: COLORS.mint, fontSize: 12, fontWeight: "700" },
  trackRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  trackRowCompact: { borderBottomWidth: 0, paddingVertical: 7 },
  trackIndex: {
    width: 24,
    color: COLORS.subtle,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  trackInfo: { flex: 1, minWidth: 0 },
  trackTitleLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  trackTitle: {
    flexShrink: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  activeText: { color: COLORS.mint },
  playingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.mint,
  },
  trackSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  trackDuration: {
    color: COLORS.subtle,
    fontSize: 11,
    minWidth: 34,
    textAlign: "right",
  },
  moreButton: {
    width: 30,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  miniPlayer: {
    minHeight: 70,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  miniInfo: { flex: 1, minWidth: 0 },
  miniTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  miniArtist: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  miniPlay: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: COLORS.mint,
  },
  miniNext: {
    width: 30,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  miniPlayerFloating: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    zIndex: 20,
  },
  miniPlayerDesktop: {
    position: "absolute",
    left: 238,
    right: 14,
    bottom: 14,
    minHeight: 64,
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 14,
    borderRadius: 16,
    zIndex: 25,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  searchBar: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 15,
    paddingHorizontal: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  pageHeaderCopy: { flex: 1 },
  eyebrow: {
    color: COLORS.mint,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  scanBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(2,8,18,0.76)",
  },
  scanCard: {
    width: "100%",
    borderRadius: 28,
    padding: 23,
    backgroundColor: "#18314C",
    borderWidth: 1,
    borderColor: "rgba(188,255,246,0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  scanHeading: { flexDirection: "row", alignItems: "center" },
  scanHeadingCopy: { marginLeft: 12 },
  scanTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
  scanSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  scanTrack: {
    height: 9,
    overflow: "hidden",
    marginTop: 22,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  scanFill: { height: "100%", borderRadius: 99, backgroundColor: COLORS.mint },
  scanStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },
  scanCount: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  scanPercent: { color: COLORS.mint, fontSize: 12, fontWeight: "800" },
  scanPath: {
    marginTop: 14,
    padding: 11,
    borderRadius: 12,
    color: COLORS.muted,
    fontSize: 11,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  scanRecentTitle: {
    color: COLORS.mint,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 6,
  },
  scanRecent: {
    minHeight: 90,
    padding: 11,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  scanRecentItem: { color: COLORS.muted, fontSize: 11, lineHeight: 18 },
  scanEmpty: { color: COLORS.subtle, fontSize: 11 },
  scanButton: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: COLORS.mint,
  },
  scanDisabled: { opacity: 0.45 },
  scanButtonText: { color: COLORS.background, fontSize: 14, fontWeight: "800" },
  dialogBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(2,8,18,0.78)",
  },
  dialogCard: {
    width: "100%",
    maxWidth: 430,
    minHeight: 236,
    padding: 28,
    borderRadius: 30,
    backgroundColor: "rgba(24,49,76,0.98)",
    borderWidth: 1,
    borderColor: "rgba(188,255,246,0.34)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 24,
  },
  dialogGlow: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    borderRadius: 16,
    backgroundColor: "rgba(94,234,212,0.14)",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.22)",
  },
  dialogTitle: {
    color: COLORS.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  dialogMessage: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  dialogButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    borderRadius: 17,
    backgroundColor: COLORS.mint,
  },
  dialogButtonPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  dialogButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: "900",
  },
  actionBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,8,18,0.78)",
  },
  actionSheet: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "rgba(24,49,76,0.99)",
    borderWidth: 1,
    borderColor: "rgba(188,255,246,0.3)",
  },
  actionHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginBottom: 14,
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginHorizontal: 4,
    marginBottom: 10,
  },
  actionItem: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94,234,212,0.11)",
  },
  actionDangerIcon: { backgroundColor: "rgba(248,113,113,0.12)" },
  actionLabel: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: "700" },
  actionDangerLabel: { color: "#F87171" },
  actionCancel: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  actionCancelText: { color: COLORS.mint, fontSize: 14, fontWeight: "800" },
});
