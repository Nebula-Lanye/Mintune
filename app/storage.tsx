import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AppDialog, Icon, styles as ui } from "@/components/mintune-ui";
import { COLORS } from "@/lib/mintune-data";
import {
  clearAppCache,
  clearDiagnosticStorage,
  formatBytes,
  getStorageSummary,
} from "@/lib/storage-cleanup";

type Summary = Awaited<ReturnType<typeof getStorageSummary>>;
export default function StorageScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState<"cache" | "logs" | null>(null);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const refresh = useCallback(
    async () => setSummary(await getStorageSummary()),
    [],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const clean = async (kind: "cache" | "logs") => {
    setBusy(kind);
    try {
      if (kind === "cache") await clearAppCache();
      else await clearDiagnosticStorage();
      await refresh();
      setDialog({
        title: "清理完成",
        message:
          kind === "cache"
            ? "封面缓存和临时备份文件已清理。"
            : "本地诊断日志及已导出的日志文件已清理。",
      });
    } catch {
      setDialog({
        title: "清理失败",
        message: "部分文件可能正在使用，请稍后重试。",
      });
    } finally {
      setBusy(null);
    }
  };
  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-background"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && ui.pressed]}
          >
            <Icon name="arrow-back" size={22} color={COLORS.text} />
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>LOCAL STORAGE</Text>
            <Text style={styles.title}>存储清理</Text>
          </View>
        </View>
        <View style={styles.hero}>
          <Icon name="storage" size={28} color={COLORS.mint} />
          <Text style={styles.heroTitle}>数据只留在本机</Text>
          <Text style={styles.heroText}>
            清理只会删除 Mintune
            自己生成的缓存和诊断文件，不会删除你的音乐、歌单或收藏。
          </Text>
        </View>
        <StorageCard
          icon="image"
          title="封面与临时缓存"
          value={
            summary
              ? `${summary.cacheFiles} 个文件 · ${formatBytes(summary.cacheBytes)}`
              : "正在统计…"
          }
          description="扫描时生成的内嵌封面缓存和临时备份文件。"
          button="清理缓存"
          disabled={!summary || summary.cacheFiles === 0}
          busy={busy === "cache"}
          onPress={() => clean("cache")}
        />
        <StorageCard
          icon="bug-report"
          title="诊断日志"
          value={
            summary
              ? `${summary.diagnosticFiles} 个导出文件 · ${formatBytes(summary.diagnosticBytes)}`
              : "正在统计…"
          }
          description="应用内部的分会话日志和已导出的诊断 JSON。"
          button="清理日志"
        disabled={!summary}
          busy={busy === "logs"}
          onPress={() => clean("logs")}
        />
        <View style={styles.note}>
          <Icon name="info-outline" size={18} color={COLORS.mint} />
          <Text style={styles.noteText}>
            新版本会按启动会话分别保存日志，每个会话最多保留 240
            条记录，避免所有日志长期写入同一个大文件。
          </Text>
        </View>
      </ScrollView>
      <AppDialog
        visible={Boolean(dialog)}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onClose={() => setDialog(null)}
      />
    </ScreenContainer>
  );
}
function StorageCard({
  icon,
  title,
  value,
  description,
  button,
  disabled,
  busy,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  value: string;
  description: string;
  button: string;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.icon}>
          <Icon name={icon} size={21} color={COLORS.mint} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      </View>
      <Text style={styles.description}>{description}</Text>
      <Pressable
        disabled={disabled || busy}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          (disabled || busy) && styles.disabled,
          pressed && ui.pressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.buttonText}>{button}</Text>
        )}
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 22,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  eyebrow: {
    color: COLORS.mint,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  title: { color: COLORS.text, fontSize: 28, fontWeight: "900", marginTop: 4 },
  hero: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "rgba(94,234,212,0.09)",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.2)",
    marginBottom: 18,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  heroText: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 7 },
  card: {
    padding: 17,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 14,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94,234,212,0.1)",
  },
  copy: { flex: 1 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  value: { color: COLORS.mint, fontSize: 11, marginTop: 4 },
  description: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 13,
  },
  button: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: COLORS.mint,
    marginTop: 15,
  },
  buttonText: { color: COLORS.background, fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.38 },
  note: {
    flexDirection: "row",
    gap: 9,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
  },
  noteText: { flex: 1, color: COLORS.muted, fontSize: 11, lineHeight: 17 },
});
