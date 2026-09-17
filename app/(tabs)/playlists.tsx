import { useRouter } from "expo-router";
import React from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Cover, Icon, MiniPlayer, PageHeader, TrackRow, styles as ui } from "@/components/mintune-ui";
import { COLORS, PLAYLISTS, getPlaylistMeta, getPlaylistTracks } from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";

export default function PlaylistsScreen() {
  const router = useRouter();
  const player = usePlayer();
  return <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
    <FlatList data={PLAYLISTS} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} renderItem={({ item }) => <PlaylistSection playlist={item} onPlay={() => { const track = getPlaylistTracks(item.id)[0]; player.playTrack(track); router.push("/player" as never); }} />} ListHeaderComponent={<PageHeader eyebrow="YOUR PLAYLISTS" title="歌单" subtitle="把喜欢的声音，收进自己的房间。" right={<Pressable accessibilityLabel="创建歌单" onPress={() => Alert.alert("创建歌单", "歌单编辑能力将在本地数据库接入后开放。", [{ text: "知道了" }])} style={({ pressed }) => [styles.addButton, pressed && ui.pressed]}><Icon name="add" size={21} color={COLORS.background} /></Pressable>} />} ListFooterComponent={<View style={styles.footer}><View style={styles.footerCard}><Icon name="auto-awesome" size={18} color={COLORS.mint} /><Text style={styles.footerText}>每一个歌单，都是你此刻的心情。</Text></View><MiniPlayer /></View>} />
  </ScreenContainer>;
}

function PlaylistSection({ playlist, onPlay }: { playlist: (typeof PLAYLISTS)[number]; onPlay: () => void }) {
  const tracks = getPlaylistTracks(playlist.id);
  return <View style={styles.playlistSection}><View style={styles.playlistHeader}><View style={[styles.playlistArtwork, { backgroundColor: playlist.tone }]}><Cover track={tracks[0]} size={70} radius={18} /><View style={styles.tinyIcon}><Icon name={playlist.icon} size={15} color={COLORS.background} /></View></View><View style={styles.playlistCopy}><Text style={styles.playlistName}>{playlist.name}</Text><Text style={styles.playlistMeta}>{getPlaylistMeta(playlist.id)}</Text><Pressable onPress={onPlay} style={({ pressed }) => [styles.playButton, pressed && ui.pressed]}><Icon name="play-arrow" size={16} color={COLORS.background} /><Text style={styles.playButtonText}>播放歌单</Text></Pressable></View><Pressable accessibilityLabel={`更多 ${playlist.name} 选项`} onPress={() => Alert.alert(playlist.name, "可查看歌单详情、分享或编辑曲目。", [{ text: "知道了" }])} style={({ pressed }) => [styles.moreButton, pressed && ui.pressed]}><Icon name="more-horiz" size={22} color={COLORS.muted} /></Pressable></View><View style={styles.playlistTracks}>{tracks.slice(0, 3).map((track, index) => <TrackRow key={track.id} track={track} index={index} compact />)}</View></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  addButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.mint },
  playlistSection: { marginBottom: 22, padding: 15, borderRadius: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  playlistHeader: { flexDirection: "row", alignItems: "center" },
  playlistArtwork: { width: 76, height: 76, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  tinyIcon: { position: "absolute", left: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(16,36,29,0.22)", alignItems: "center", justifyContent: "center" },
  playlistCopy: { flex: 1, marginLeft: 13 },
  playlistName: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  playlistMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  playButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10, borderRadius: 999, backgroundColor: COLORS.mint },
  playButtonText: { color: COLORS.background, fontSize: 11, fontWeight: "800" },
  moreButton: { width: 32, height: 34, alignItems: "center", justifyContent: "center" },
  playlistTracks: { marginTop: 12, paddingTop: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider },
  footer: { paddingTop: 4 },
  footerCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, marginBottom: 12, borderRadius: 16, backgroundColor: "rgba(183,231,200,0.08)" },
  footerText: { color: COLORS.muted, fontSize: 11 },
});
