import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Icon, MiniPlayer, PageHeader, styles as ui } from "@/components/mintune-ui";
import { APP_VERSION, COLORS, EQUALIZER_PRESETS, PLAYBACK_SPEEDS, SAMPLE_NOTE, SUPPORTED_FORMATS } from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";

export default function SettingsScreen() {
  const router = useRouter();
  const player = usePlayer();
  const [darkMode, setDarkMode] = useState(true);
  const [gapless, setGapless] = useState(true);
  const [quality, setQuality] = useState("自动");
  const openMessage = (title: string, message: string) => Alert.alert(title, message);
  return <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="YOUR SPACE" title="设置" subtitle="让播放体验更贴近你" />
      <View style={styles.brandCard}>
        <Image source={require("@/assets/images/mintune-logo.png")} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="Mintune 薄荷音乐 Logo" />
      </View>
      <View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>L</Text></View><View style={styles.profileCopy}><Text style={styles.profileTitle}>Lanye 的音乐空间</Text><Text style={styles.profileSubtitle}>无需注册账号即可开始使用</Text></View><Icon name="chevron-right" size={20} color={COLORS.subtle} /></View>

      <SettingGroup title="外观"><SettingRow icon="dark-mode" title="深色模式" subtitle="更适合夜晚聆听" right={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: COLORS.divider, true: COLORS.mint }} thumbColor={darkMode ? COLORS.background : COLORS.muted} />} /><SettingRow icon="language" title="语言" subtitle="简体中文" onPress={() => openMessage("语言", "当前版本支持简体中文。")} /></SettingGroup>

      <SettingGroup title="播放与音质"><SettingRow icon="equalizer" title="均衡器" subtitle="调节不同频段，让声音更贴近你的偏好" onPress={() => router.push("/equalizer" as never)} /><SettingRow icon="graphic-eq" title="播放音质" subtitle={quality === "自动" ? "自动 · 根据文件格式播放" : quality} onPress={() => setQuality(quality === "自动" ? "高解析" : "自动")} /><SettingRow icon="speed" title="播放速度" subtitle="1×" onPress={() => openMessage("播放速度", `支持 ${PLAYBACK_SPEEDS.join(" / ")} 倍速选择。`)} /><SettingRow icon="sync" title="无缝播放" subtitle="歌曲之间不留空隙" right={<Switch value={gapless} onValueChange={setGapless} trackColor={{ false: COLORS.divider, true: COLORS.mint }} thumbColor={gapless ? COLORS.background : COLORS.muted} />} /></SettingGroup>

      <SettingGroup title="本地音乐"><SettingRow icon="folder" title="扫描本地音乐" subtitle="从设备导入音乐并读取完整音频信息" onPress={() => openMessage("扫描本地音乐", `${SAMPLE_NOTE}\n\n本地数据库已就绪，下一步可接入 Android MediaStore / iOS MediaLibrary。`)} /><SettingRow icon="storage" title="存储空间" subtitle={`本地数据库 · ${player.tracks.length} 首歌曲`} onPress={() => openMessage("存储空间", `支持的格式：${SUPPORTED_FORMATS.join("、")}`)} /><SettingRow icon="lock-outline" title="隐私优先" subtitle="不会上传你的音乐文件" onPress={() => openMessage("隐私优先", "你的音乐和播放记录只保存在这台设备上。")} /></SettingGroup>

      <SettingGroup title="关于 Mintune"><SettingRow icon="info-outline" title="关于 Mintune" subtitle="为喜欢音乐的人，留一块安静的空间" onPress={() => openMessage("Mintune", `版本 ${APP_VERSION}\nsoftly in tune`)} /><SettingRow icon="feedback" title="反馈建议" subtitle="喜欢 Mintune？欢迎告诉我们你的想法" onPress={() => openMessage("反馈建议", "感谢你的反馈！请通过项目仓库提交建议。")}/></SettingGroup>
      <Text style={styles.footer}>Mintune · softly in tune · 2026.09</Text>
      <MiniPlayer />
    </ScrollView>
  </ScreenContainer>;
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.group}><Text style={styles.groupTitle}>{title}</Text><View style={styles.groupCard}>{children}</View></View>;
}

function SettingRow({ icon, title, subtitle, right, onPress }: { icon: React.ComponentProps<typeof Icon>["name"]; title: string; subtitle: string; right?: React.ReactNode; onPress?: () => void }) {
  return <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, pressed && ui.pressed]}><View style={styles.rowIcon}><Icon name={icon} size={19} color={COLORS.mint} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text numberOfLines={2} style={styles.rowSubtitle}>{subtitle}</Text></View>{right ?? <Icon name="chevron-right" size={19} color={COLORS.subtle} />}</Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  brandCard: { alignItems: "center", marginBottom: 18, borderRadius: 20, backgroundColor: "#050D20", overflow: "hidden" },
  brandLogo: { width: "100%", height: 110 },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 16, marginBottom: 25, borderRadius: 20, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.divider },
  avatar: { width: 49, height: 49, borderRadius: 17, backgroundColor: COLORS.mint, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.background, fontSize: 22, fontWeight: "900" },
  profileCopy: { flex: 1, marginLeft: 12 },
  profileTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  profileSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  group: { marginBottom: 22 },
  groupTitle: { color: COLORS.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 9, textTransform: "uppercase" },
  groupCard: { overflow: "hidden", borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  rowIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(183,231,200,0.09)" },
  rowCopy: { flex: 1 },
  rowTitle: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  rowSubtitle: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  footer: { color: COLORS.subtle, fontSize: 10, textAlign: "center", marginTop: 2, marginBottom: 15 },
});
