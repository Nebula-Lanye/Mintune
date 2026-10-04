import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Icon, PageHeader, SearchBar, TrackRow, styles as ui } from "@/components/mintune-ui";
import { COLORS, FILTERS, SORTS, getSearchResults, getSortedTracks } from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";

export default function LibraryScreen() {
  const player = usePlayer();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(FILTERS[0]);
  const [sort, setSort] = useState(SORTS[0]);
  const [showSorts, setShowSorts] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scanRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (!scanning) { scanRotation.stopAnimation(); scanRotation.setValue(0); return; } const animation = Animated.loop(Animated.timing(scanRotation, { toValue: 1, duration: 850, easing: Easing.linear, useNativeDriver: true })); animation.start(); return () => animation.stop(); }, [scanning, scanRotation]);
  const results = useMemo(() => getSortedTracks(getSearchResults(query, filter, player.favorites, player.tracks), sort), [filter, player.favorites, player.tracks, query, sort]);
  const scanMusic = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const count = await player.scanLocalMusic();
      Alert.alert("扫描完成", count ? `已导入 ${count} 首本地音乐。` : "没有找到可导入的音频文件。", [{ text: "好的" }]);
    } catch (error) {
      Alert.alert("无法扫描音乐", error instanceof Error ? error.message : "请检查音乐访问权限后重试。", [{ text: "知道了" }]);
    } finally { setScanning(false); }
  };

  return <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
    <FlatList data={results} keyExtractor={(item) => item.id} renderItem={({ item, index }) => <TrackRow track={item} index={index} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} ListHeaderComponent={<>
      <PageHeader eyebrow="YOUR COLLECTION" title="音乐库" subtitle="你的私人音乐档案" right={<Pressable accessibilityLabel="扫描设备音乐" disabled={scanning} onPress={scanMusic} style={({ pressed }) => [styles.scanButton, scanning && styles.scanning, pressed && ui.pressed]}><Animated.View style={{ transform: [{ rotate: scanRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}><Icon name="sync" size={19} color={COLORS.mint} /></Animated.View></Pressable>} />
      <SearchBar value={query} onChangeText={setQuery} />
      <FlatList data={FILTERS} horizontal keyExtractor={(item) => item} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList} renderItem={({ item }) => <Pressable onPress={() => setFilter(item)} style={({ pressed }) => [styles.filterPill, filter === item && styles.filterPillActive, pressed && ui.pressed]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>} />
      <View style={styles.librarySummary}><View><Text style={styles.summaryNumber}>{player.tracks.length}</Text><Text style={styles.summaryLabel}>首歌曲</Text></View><View style={styles.summaryDivider} /><View><Text style={styles.summaryNumber}>{new Set(player.tracks.map((track) => track.album)).size}</Text><Text style={styles.summaryLabel}>张专辑</Text></View><View style={styles.summaryDivider} /><View><Text style={styles.summaryNumber}>{player.tracks.filter((track) => track.quality === "HI-RES").length}</Text><Text style={styles.summaryLabel}>首高解析</Text></View><Pressable accessibilityLabel="选择排序方式" onPress={() => setShowSorts((value) => !value)} style={({ pressed }) => [styles.sortButton, pressed && ui.pressed]}><Icon name="sort" size={16} color={COLORS.mint} /><Text style={styles.sortText}>{sort}</Text></Pressable></View>
      {showSorts ? <View style={styles.sortMenu}>{SORTS.map((item) => <Pressable key={item} onPress={() => { setSort(item); setShowSorts(false); }} style={({ pressed }) => [styles.sortItem, pressed && ui.pressed]}><Text style={[styles.sortItemText, item === sort && styles.activeText]}>{item}</Text>{item === sort ? <Icon name="check" size={16} color={COLORS.mint} /> : null}</Pressable>)}</View> : null}
      <View style={styles.resultHeader}><Text style={styles.resultTitle}>{query ? `搜索结果 · ${results.length} 首` : "全部歌曲"}</Text><Text style={styles.resultMeta}>按{sort}排序</Text></View>
      {results.length === 0 ? <View style={styles.empty}><Icon name="music-off" size={30} color={COLORS.muted} /><Text style={styles.emptyTitle}>没有找到匹配的音乐</Text><Text style={styles.emptyText}>试试搜索歌曲名或艺人</Text></View> : null}
    </>} ListFooterComponent={<View style={styles.footer}><Text style={styles.footerText}>{player.tracks.length ? "曲目来自你的设备，并保存在本地数据库。" : "点击右上角扫描设备中的音乐文件。"}</Text></View>} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  scanButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  scanning: { opacity: 0.45 },
  filterList: { gap: 8, paddingVertical: 16 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  filterPillActive: { backgroundColor: COLORS.mint, borderColor: COLORS.mint },
  filterText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: COLORS.background },
  librarySummary: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  summaryNumber: { color: COLORS.text, fontSize: 21, fontWeight: "800" },
  summaryLabel: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  summaryDivider: { width: 1, height: 31, backgroundColor: COLORS.divider, marginHorizontal: 16 },
  sortButton: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surfaceAlt },
  sortText: { color: COLORS.mint, fontSize: 11, fontWeight: "800" },
  sortMenu: { marginTop: 8, borderRadius: 14, padding: 6, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.divider },
  sortItem: { minHeight: 40, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 9 },
  sortItemText: { color: COLORS.text, fontSize: 13 },
  activeText: { color: COLORS.mint, fontWeight: "800" },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 4 },
  resultTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
  resultMeta: { color: COLORS.subtle, fontSize: 11 },
  empty: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 14 },
  emptyText: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  footer: { paddingTop: 16, paddingBottom: 10 },
  footerText: { color: COLORS.subtle, fontSize: 10, lineHeight: 16, textAlign: "center", marginBottom: 12 },
});
