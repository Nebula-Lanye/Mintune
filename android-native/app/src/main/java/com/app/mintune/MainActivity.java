package com.app.mintune;

import android.Manifest;
import android.app.Activity;
import android.content.ContentUris;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int REQUEST_AUDIO = 1001;
    private final List<LibraryDbHelper.Track> tracks = new ArrayList<>();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private LibraryDbHelper database;
    private LinearLayout trackList;
    private TextView status;
    private EditText search;
    private int playingIndex = -1;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        database = new LibraryDbHelper(this);
        buildUi();
        if (hasAudioPermission()) loadSavedTracks(); else requestAudioPermission();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(24, 24, 24, 12); root.setBackgroundColor(Color.rgb(8, 26, 48));
        LinearLayout header = new LinearLayout(this); header.setGravity(Gravity.CENTER_VERTICAL); header.setPadding(0, 0, 0, 18);
        TextView logo = text("M  MINTUNE", 22, Color.rgb(94, 234, 212)); logo.setTypeface(null, 1); header.addView(logo, new LinearLayout.LayoutParams(0, -2, 1));
        Button scan = button("扫描音乐"); scan.setOnClickListener(v -> scanMediaStore()); header.addView(scan, new LinearLayout.LayoutParams(-2, 48)); root.addView(header);
        TextView subtitle = text("本地优先 · 纯 Java 原生 Android", 13, Color.rgb(154, 173, 194)); root.addView(subtitle);
        search = new EditText(this); search.setHint("搜索歌曲、艺人或专辑"); search.setTextColor(Color.WHITE); search.setHintTextColor(Color.rgb(154, 173, 194)); search.setSingleLine(true); search.setPadding(18, 0, 18, 0); search.addTextChangedListener(new android.text.TextWatcher() { public void beforeTextChanged(CharSequence s, int st, int c, int a) {} public void onTextChanged(CharSequence s, int st, int b, int c) { renderTracks(); } public void afterTextChanged(android.text.Editable e) {} }); root.addView(search, new LinearLayout.LayoutParams(-1, 54));
        status = text("正在准备音乐库…", 13, Color.rgb(94, 234, 212)); status.setPadding(0, 12, 0, 12); root.addView(status);
        ScrollView scroll = new ScrollView(this); trackList = new LinearLayout(this); trackList.setOrientation(LinearLayout.VERTICAL); scroll.addView(trackList); root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout controls = new LinearLayout(this); controls.setGravity(Gravity.CENTER_VERTICAL); controls.setPadding(0, 12, 0, 0); Button previous = button("⏮"); previous.setOnClickListener(v -> playRelative(-1)); Button toggle = button("播放 / 暂停"); toggle.setOnClickListener(v -> togglePlayback()); Button next = button("⏭"); next.setOnClickListener(v -> playRelative(1)); controls.addView(previous); controls.addView(toggle, new LinearLayout.LayoutParams(0, 48, 1)); controls.addView(next); root.addView(controls); setContentView(root);
    }

    private TextView text(String value, int size, int color) { TextView view = new TextView(this); view.setText(value); view.setTextSize(size); view.setTextColor(color); return view; }
    private Button button(String label) { Button button = new Button(this); button.setText(label); button.setTextColor(Color.rgb(8, 26, 48)); button.setTextSize(12); button.setAllCaps(false); return button; }
    private boolean hasAudioPermission() { return Build.VERSION.SDK_INT < 33 ? checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED : checkSelfPermission(Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED; }
    private void requestAudioPermission() { requestPermissions(Build.VERSION.SDK_INT < 33 ? new String[]{Manifest.permission.READ_EXTERNAL_STORAGE} : new String[]{Manifest.permission.READ_MEDIA_AUDIO, Manifest.permission.POST_NOTIFICATIONS}, REQUEST_AUDIO); }
    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] results) { super.onRequestPermissionsResult(request, permissions, results); if (request == REQUEST_AUDIO && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) loadSavedTracks(); else status.setText("需要音乐访问权限才能扫描本地歌曲"); }

    private void loadSavedTracks() { executor.execute(() -> { List<LibraryDbHelper.Track> saved = database.all(); runOnUiThread(() -> { tracks.clear(); tracks.addAll(saved); status.setText(saved.size() + " 首歌曲"); renderTracks(); }); }); }
    private void scanMediaStore() { status.setText("正在扫描设备音乐…"); executor.execute(() -> { String[] columns = {MediaStore.Audio.Media._ID, MediaStore.Audio.Media.TITLE, MediaStore.Audio.Media.ARTIST, MediaStore.Audio.Media.ALBUM, MediaStore.Audio.Media.DURATION, MediaStore.Audio.Media.MIME_TYPE}; try (Cursor cursor = getContentResolver().query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, columns, MediaStore.Audio.Media.IS_MUSIC + " != 0", null, MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC")) { if (cursor != null) while (cursor.moveToNext()) { long id = cursor.getLong(0); String title = safe(cursor.getString(1), "未知歌曲"); String artist = safe(cursor.getString(2), "未知艺人"); String album = safe(cursor.getString(3), "未知专辑"); long duration = cursor.getLong(4); String uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id).toString(); database.upsert(uri, title, artist, album, duration); } } List<LibraryDbHelper.Track> saved = database.all(); runOnUiThread(() -> { tracks.clear(); tracks.addAll(saved); status.setText("扫描完成 · " + saved.size() + " 首歌曲"); renderTracks(); }); }); }
    private String safe(String value, String fallback) { return value == null || value.trim().isEmpty() || "<unknown>".equalsIgnoreCase(value) ? fallback : value; }

    private void renderTracks() { if (trackList == null) return; trackList.removeAllViews(); String query = search == null ? "" : search.getText().toString().trim().toLowerCase(Locale.ROOT); for (int i = 0; i < tracks.size(); i++) { final int trackIndex = i; LibraryDbHelper.Track track = tracks.get(trackIndex); String haystack = (track.title + " " + track.artist + " " + track.album).toLowerCase(Locale.ROOT); if (!query.isEmpty() && !haystack.contains(query)) continue; TextView row = text((trackIndex == playingIndex ? "▶  " : "○  ") + track.title + "\n     " + track.artist + " · " + track.album, 15, trackIndex == playingIndex ? Color.rgb(94, 234, 212) : Color.WHITE); row.setGravity(Gravity.CENTER_VERTICAL); row.setPadding(18, 8, 12, 8); row.setBackgroundColor(Color.rgb(20, 49, 78)); row.setOnClickListener(v -> play(trackIndex)); LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, 68); params.setMargins(0, 0, 0, 6); trackList.addView(row, params); } if (trackList.getChildCount() == 0) { TextView empty = text("还没有找到音乐\n点击右上角“扫描音乐”导入设备歌曲", 16, Color.rgb(154, 173, 194)); empty.setGravity(Gravity.CENTER); trackList.addView(empty, new LinearLayout.LayoutParams(-1, 180)); } }

    private void play(int index) { if (index < 0 || index >= tracks.size()) return; LibraryDbHelper.Track track = tracks.get(index); Intent intent = new Intent(this, PlaybackService.class).setAction(PlaybackService.ACTION_PLAY).putExtra(PlaybackService.EXTRA_URI, track.uri).putExtra(PlaybackService.EXTRA_TITLE, track.title).putExtra(PlaybackService.EXTRA_ARTIST, track.artist); if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent); else startService(intent); playingIndex = index; status.setText("正在播放 · " + track.title); renderTracks(); }
    private void togglePlayback() { if (playingIndex < 0 && !tracks.isEmpty()) { play(0); return; } startService(new Intent(this, PlaybackService.class).setAction(PlaybackService.ACTION_TOGGLE)); }
    private void playRelative(int delta) { if (tracks.isEmpty()) return; int next = playingIndex < 0 ? 0 : (playingIndex + delta + tracks.size()) % tracks.size(); play(next); }
    @Override protected void onDestroy() { executor.shutdownNow(); database.close(); super.onDestroy(); }
}
