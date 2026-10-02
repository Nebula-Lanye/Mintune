import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Cover, Icon, PageHeader, TrackRow, styles as ui } from "@/components/mintune-ui";
import { COLORS, type Track } from "@/lib/mintune-data";
import { usePlayer } from "@/lib/player-context";

export default function PlaylistsScreen() {
  const router = useRouter();
  const player = usePlayer();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const submit = () => {
    try { player.createPlaylist(name); setName(""); setShowCreate(false); }
    catch { Alert.alert("无法创建歌单", "请输入一个歌单名称。", [{ text: "知道了" }]); }
  };
  return <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
    <FlatList data={player.playlists} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} renderItem={({ item }) => <PlaylistSection playlist={item} tracks={player.getPlaylistTracks(item.id)} onPlay={() => { const playlistTracks = player.getPlaylistTracks(item.id); const track = playlistTracks[0]; if (track) { player.playTrack(track, playlistTracks); router.push("/player" as never); } }} onDelete={() => { player.deletePlaylist(item.id); }} />} ListHeaderComponent={<PageHeader eyebrow="YOUR PLAYLISTS" title="歌单" subtitle={`${player.playlists.length} 个歌单 · 存储在本地设备`} right={<Pressable accessibilityLabel="创建歌单" onPress={() => setShowCreate(true)} style={({ pressed }) => [styles.addButton, pressed && ui.pressed]}><Icon name="add" size={21} color={COLORS.background} /></Pressable>} />} ListEmptyComponent={<View style={styles.empty}><Icon name="queue-music" size={31} color={COLORS.muted} /><Text style={styles.emptyTitle}>还没有歌单</Text><Text style={styles.emptyText}>点击右上角创建你的第一个歌单</Text></View>} ListFooterComponent={<View style={styles.footer}><View style={styles.footerCard}><Icon name="storage" size={18} color={COLORS.mint} /><Text style={styles.footerText}>歌单和曲目关系会自动保存到本地数据库。</Text></View></View>} />
    <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>创建歌单</Text><Text style={styles.modalSubtitle}>给这段声音起一个名字</Text><TextInput autoFocus value={name} onChangeText={setName} placeholder="例如：周末散步" placeholderTextColor={COLORS.subtle} returnKeyType="done" onSubmitEditing={submit} style={styles.input} /><View style={styles.modalActions}><Pressable onPress={() => setShowCreate(false)} style={({ pressed }) => [styles.cancelButton, pressed && ui.pressed]}><Text style={styles.cancelText}>取消</Text></Pressable><Pressable onPress={submit} style={({ pressed }) => [styles.confirmButton, pressed && ui.pressed]}><Text style={styles.confirmText}>创建</Text></Pressable></View></View></View></Modal>
  </ScreenContainer>;
}

function PlaylistSection({ playlist, tracks, onPlay, onDelete }: { playlist: { id: string; name: string; count: number; tone: string; icon: string; isDefault: boolean }; tracks: Track[]; onPlay: () => void; onDelete: () => void }) {
  const player = usePlayer();
  const firstTrack = tracks[0];
  return <View style={styles.playlistSection}><View style={styles.playlistHeader}><View style={[styles.playlistArtwork, { backgroundColor: playlist.tone }]}>{firstTrack ? <Cover track={firstTrack} size={70} radius={18} /> : <Icon name="queue-music" size={28} color={COLORS.background} />}<View style={styles.tinyIcon}><Icon name={playlist.icon as React.ComponentProps<typeof Icon>["name"]} size={15} color={COLORS.background} /></View></View><View style={styles.playlistCopy}><Text style={styles.playlistName}>{playlist.name}</Text><Text style={styles.playlistMeta}>{playlist.count} 首歌 · {playlist.isDefault ? "默认歌单" : "自定义歌单"}</Text><Pressable onPress={onPlay} disabled={!firstTrack} style={({ pressed }) => [styles.playButton, !firstTrack && styles.disabled, pressed && ui.pressed]}><Icon name="play-arrow" size={16} color={COLORS.background} /><Text style={styles.playButtonText}>播放歌单</Text></Pressable></View><Pressable accessibilityLabel={`更多 ${playlist.name} 选项`} onPress={() => playlist.isDefault ? Alert.alert("默认歌单", "默认歌单不能删除。", [{ text: "知道了" }]) : Alert.alert("歌单操作", "选择要执行的操作", [{ text: "重命名", onPress: () => Alert.prompt("重命名歌单", "输入新的歌单名称", [{ text: "取消", style: "cancel" }, { text: "保存", onPress: (value?: string) => { if (value) player.renamePlaylist(playlist.id, value); } }], "plain-text", playlist.name) }, { text: "删除歌单", style: "destructive", onPress: onDelete }, { text: "取消", style: "cancel" }])} style={({ pressed }) => [styles.moreButton, pressed && ui.pressed]}><Icon name="more-horiz" size={22} color={COLORS.muted} /></Pressable></View><View style={styles.playlistTracks}>{tracks.slice(0, 3).map((track, index) => <TrackRow key={track.id} track={track} index={index} compact onLongPress={() => Alert.alert("移除歌曲", `从「${playlist.name}」移除这首歌？`, [{ text: "取消", style: "cancel" }, { text: "移除", style: "destructive", onPress: () => player.removeTrackFromPlaylist(playlist.id, track.id) }])} />)}</View></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  addButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.mint },
  playlistSection: { marginBottom: 22, padding: 15, borderRadius: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  playlistHeader: { flexDirection: "row", alignItems: "center" },
  playlistArtwork: { width: 76, height: 76, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  tinyIcon: { position: "absolute", left: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(13,27,46,0.22)", alignItems: "center", justifyContent: "center" },
  playlistCopy: { flex: 1, marginLeft: 13 },
  playlistName: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  playlistMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  playButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10, borderRadius: 999, backgroundColor: COLORS.mint },
  playButtonText: { color: COLORS.background, fontSize: 11, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  moreButton: { width: 32, height: 34, alignItems: "center", justifyContent: "center" },
  playlistTracks: { marginTop: 12, paddingTop: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider },
  empty: { alignItems: "center", paddingVertical: 65 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 14 },
  emptyText: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  footer: { paddingTop: 4 },
  footerCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, marginBottom: 12, borderRadius: 16, backgroundColor: "rgba(94,234,212,0.08)" },
  footerText: { color: COLORS.muted, fontSize: 11 },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "rgba(0,0,0,0.62)" },
  modalCard: { width: "100%", maxWidth: 360, padding: 20, borderRadius: 22, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.divider },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  input: { height: 48, color: COLORS.text, paddingHorizontal: 13, marginTop: 18, borderRadius: 13, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 17 },
  cancelButton: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999 },
  cancelText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  confirmButton: { paddingHorizontal: 17, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.mint },
  confirmText: { color: COLORS.background, fontSize: 13, fontWeight: "800" },
});
