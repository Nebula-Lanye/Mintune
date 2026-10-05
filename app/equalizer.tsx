import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Icon, styles as ui } from "@/components/mintune-ui";
import { COLORS, EQUALIZER_BANDS, EQUALIZER_PRESETS } from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";

const CURVES: Record<string, number[]> = {
  平衡: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  流行: [2, 1.5, 0, -1, -2, -1, 0, 1, 2, 2.5],
  古典: [2, 1.5, 1, 0, -1, -1, 0, 1.5, 2, 2],
  人声: [-2, -1, 0, 2, 3, 3, 2, 1, 0, -1],
  低音: [5, 4, 3, 1.5, 0, -1, -2, -2, -1, 0],
};
const STORAGE_KEY = "mintune:equalizer:v2";

export default function EqualizerScreen() {
  const router = useRouter();
  const player = usePlayer();
  const [preset, setPreset] = useState<string>(EQUALIZER_PRESETS[0]);
  const [levels, setLevels] = useState<number[]>(player.equalizerLevels);
  const levelsRef = useRef(levels);
  const dragStartRef = useRef<number[]>(levels);
  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (!value) return;
      try {
        const saved = JSON.parse(value) as {
          preset?: string;
          enabled?: boolean;
          levels?: number[];
        };
        if (saved.preset && CURVES[saved.preset]) setPreset(saved.preset);
        if (typeof saved.enabled === "boolean")
          player.setEqualizerEnabled(saved.enabled);
        if (saved.levels?.length === EQUALIZER_BANDS.length) {
          setLevels(saved.levels);
          player.setEqualizerLevels(saved.levels);
        }
      } catch {
        /* use native defaults */
      }
    });
  }, [player.setEqualizerEnabled, player.setEqualizerLevels]);
  const persist = (nextPreset: string, nextLevels: number[]) => {
    setPreset(nextPreset);
    setLevels(nextLevels);
    levelsRef.current = nextLevels;
    player.setEqualizerLevels(nextLevels);
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        preset: nextPreset,
        enabled: player.equalizerEnabled,
        levels: nextLevels,
      }),
    );
  };
  const updateLevel = (index: number, value: number) => {
    const next = levelsRef.current.map((level, itemIndex) =>
      itemIndex === index
        ? Math.max(-12, Math.min(12, Math.round(value * 2) / 2))
        : level,
    );
    levelsRef.current = next;
    setLevels(next);
  };
  const commitLevels = () => {
    const next = [...levelsRef.current];
    setPreset("自定义");
    player.setEqualizerLevels(next);
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        preset: "自定义",
        enabled: player.equalizerEnabled,
        levels: next,
      }),
    );
  };
  const respondersRef = useRef<ReturnType<typeof PanResponder.create>[]>([]);
  if (respondersRef.current.length === 0)
    respondersRef.current = EQUALIZER_BANDS.map((_, index) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStartRef.current[index] = levelsRef.current[index] ?? 0;
        },
        onPanResponderMove: (_, gesture) =>
          updateLevel(
            index,
            (dragStartRef.current[index] ?? 0) - gesture.dy / 16,
          ),
        onPanResponderRelease: commitLevels,
        onPanResponderTerminate: commitLevels,
      }),
    );
  const responders = respondersRef.current;
  const toggleEnabled = (enabled: boolean) => {
    player.setEqualizerEnabled(enabled);
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ preset, enabled, levels }),
    );
  };
  const reset = () => {
    const next = Array(10).fill(0);
    setPreset("平衡");
    setLevels(next);
    levelsRef.current = next;
    player.resetEqualizer();
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        preset: "平衡",
        enabled: player.equalizerEnabled,
        levels: next,
      }),
    );
  };
  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-background"
    >
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="返回设置"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.topButton, pressed && ui.pressed]}
          >
            <Icon name="arrow-back" size={22} color={COLORS.text} />
          </Pressable>
          <Text style={styles.topTitle}>均衡器</Text>
          <Pressable
            accessibilityLabel="关闭均衡器"
            onPress={() => router.dismiss()}
            style={({ pressed }) => [styles.topButton, pressed && ui.pressed]}
          >
            <Icon name="close" size={22} color={COLORS.text} />
          </Pressable>
        </View>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Icon name="equalizer" size={25} color={COLORS.background} />
          </View>
          <Text style={styles.introTitle}>塑造你的声音</Text>
          <Text style={styles.introText}>
            queue-player 原生十段 EQ，实时作用于播放链路。
          </Text>
        </View>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>均衡器</Text>
            <Text style={styles.switchText}>
              {player.equalizerEnabled
                ? "已启用原生音频处理"
                : "直通播放，不改变原声音色"}
            </Text>
          </View>
          <Switch
            value={player.equalizerEnabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: COLORS.divider, true: COLORS.mint }}
            thumbColor={COLORS.text}
          />
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>预设</Text>
          <Pressable onPress={reset}>
            <Text style={styles.reset}>重置</Text>
          </Pressable>
        </View>
        <View style={styles.presetRow}>
          {EQUALIZER_PRESETS.map((item) => (
            <Pressable
              key={item}
              onPress={() => persist(item, CURVES[item] ?? CURVES.平衡)}
              style={({ pressed }) => [
                styles.presetPill,
                preset === item && styles.presetActive,
                pressed && ui.pressed,
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  preset === item && styles.presetTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <View
          style={[
            styles.eqCard,
            !player.equalizerEnabled && styles.disabledCard,
          ]}
        >
          <View style={styles.scale}>
            <Text style={styles.scaleText}>+12</Text>
            <Text style={styles.scaleText}>0</Text>
            <Text style={styles.scaleText}>−12</Text>
          </View>
          <View style={styles.bars}>
            {levels.map((level, index) => (
              <View
                key={EQUALIZER_BANDS[index]}
                {...responders[index].panHandlers}
                style={styles.band}
              >
                <View style={styles.track}>
                  <View style={[styles.centerLine, { top: "50%" }]} />
                  <View
                    style={[
                      styles.level,
                      { height: `${Math.max(3, ((level + 12) / 24) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.bandLabel}>{EQUALIZER_BANDS[index]}</Text>
                <Text style={styles.bandValue}>
                  {level > 0 ? `+${level}` : level} dB
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.infoCard}>
          <Icon name="touch-app" size={19} color={COLORS.mint} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>拖动调节</Text>
            <Text style={styles.infoText}>
              按住频段上下滑动，范围 −12 dB 到 +12 dB，步进 0.5 dB。
            </Text>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  topBar: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  topTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  intro: { alignItems: "center", marginTop: 22, marginBottom: 20 },
  introIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mint,
    marginBottom: 12,
  },
  introTitle: { color: COLORS.text, fontSize: 24, fontWeight: "800" },
  introText: { color: COLORS.muted, fontSize: 11, marginTop: 7 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  switchTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  switchText: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  reset: { color: COLORS.mint, fontSize: 12, fontWeight: "800" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  presetActive: { backgroundColor: COLORS.mint, borderColor: COLORS.mint },
  presetText: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  presetTextActive: { color: COLORS.background },
  eqCard: {
    marginTop: 20,
    padding: 12,
    paddingLeft: 24,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  disabledCard: { opacity: 0.55 },
  scale: {
    position: "absolute",
    left: 7,
    top: 17,
    bottom: 38,
    justifyContent: "space-between",
  },
  scaleText: { color: COLORS.subtle, fontSize: 8 },
  bars: {
    height: 245,
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 4,
  },
  band: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  track: {
    width: 7,
    flex: 1,
    justifyContent: "flex-end",
    borderRadius: 6,
    backgroundColor: COLORS.divider,
    overflow: "hidden",
  },
  centerLine: {
    position: "absolute",
    left: -2,
    right: -2,
    height: 1,
    backgroundColor: COLORS.subtle,
    zIndex: 2,
  },
  level: { width: "100%", borderRadius: 6, backgroundColor: COLORS.mint },
  bandLabel: { color: COLORS.muted, fontSize: 8, marginTop: 10 },
  bandValue: { color: COLORS.subtle, fontSize: 8, marginTop: 4 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 15,
    marginTop: 14,
    borderRadius: 17,
    backgroundColor: "rgba(94,234,212,0.08)",
  },
  infoCopy: { flex: 1 },
  infoTitle: { color: COLORS.mint, fontSize: 12, fontWeight: "800" },
  infoText: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
});
