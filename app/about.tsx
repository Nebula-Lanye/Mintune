import { useRouter } from "expo-router";
import Constants from "expo-constants";
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Icon, styles as ui } from "@/components/mintune-ui";
import { APP_VERSION, COLORS } from "@/lib/mintune-data";

export default function AboutScreen() {
  const router = useRouter();
  const version =
    Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? APP_VERSION;
  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-background"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityLabel="返回设置"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && ui.pressed]}
        >
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </Pressable>
        <View style={styles.brand}>
          <Image
            source={require("@/assets/images/mintune-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.version}>版本 {version}</Text>
          <Text style={styles.tagline}>softly in tune</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>关于 Mintune</Text>
          <Text style={styles.body}>
            Mintune
            薄荷音乐是一款本地优先的音乐播放器。你的音乐、歌单、收藏、歌词和播放记录默认保存在设备本地，无需注册账号，也不会上传音乐文件。
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>主要功能</Text>
          {[
            "本地音乐扫描与元数据解析",
            "FLAC、ALAC、M4A 等格式支持",
            "内嵌与外部封面、LRC 歌词",
            "原生十段均衡器和媒体控制",
            "本地备份、恢复与诊断工具",
          ].map((item) => (
            <View key={item} style={styles.feature}>
              <Icon name="check-circle" size={18} color={COLORS.mint} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>开源鸣谢</Text>
          <Text style={styles.body}>
            感谢 react-native-queue-player、react-native-nitro-modules 以及
            Expo、React Native 社区的开源贡献。完整许可证和版权声明可在项目的
            THIRD-PARTY-NOTICES.md 中查看。
          </Text>
        </View>
        <Text style={styles.footer}>Mintune · 薄荷音乐 · 2026</Text>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  brand: { alignItems: "center", marginTop: 20, marginBottom: 24 },
  logo: { width: 230, height: 110 },
  version: {
    color: COLORS.mint,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },
  tagline: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
    letterSpacing: 1.5,
  },
  card: {
    padding: 17,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 14,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  body: { color: COLORS.muted, fontSize: 12, lineHeight: 20 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 7,
  },
  featureText: { color: COLORS.muted, fontSize: 12 },
  footer: {
    color: COLORS.subtle,
    textAlign: "center",
    fontSize: 10,
    marginTop: 8,
  },
});
