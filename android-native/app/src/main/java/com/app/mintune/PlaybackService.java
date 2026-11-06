package com.app.mintune;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;

import java.io.IOException;
import java.util.ArrayList;

public final class PlaybackService extends Service {
    public static final String ACTION_PLAY = "com.app.mintune.PLAY";
    public static final String ACTION_TOGGLE = "com.app.mintune.TOGGLE";
    public static final String ACTION_STOP = "com.app.mintune.STOP";
    public static final String ACTION_SET_EQ = "com.app.mintune.SET_EQ";
    public static final String ACTION_NEXT = "com.app.mintune.NEXT";
    public static final String ACTION_PREVIOUS = "com.app.mintune.PREVIOUS";
    public static final String EXTRA_URI = "uri";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_QUEUE_URI = "queue_uri";
    public static final String EXTRA_QUEUE_TITLE = "queue_title";
    public static final String EXTRA_QUEUE_ARTIST = "queue_artist";
    public static final String EXTRA_QUEUE_INDEX = "queue_index";
    private static final String CHANNEL_ID = "mintune_playback";
    private static final int NOTIFICATION_ID = 4805;
    private MediaPlayer player;
    private MediaSession mediaSession;
    private final EqualizerController equalizer = new EqualizerController();
    private String title = "Mintune";
    private String artist = "本地音乐";
    private final ArrayList<String> queueUris = new ArrayList<>();
    private final ArrayList<String> queueTitles = new ArrayList<>();
    private final ArrayList<String> queueArtists = new ArrayList<>();
    private int queueIndex;

    @Override public void onCreate() { super.onCreate(); createChannel(); mediaSession = new MediaSession(this, "Mintune"); mediaSession.setCallback(new MediaSession.Callback() { @Override public void onPlay() { if (player != null) { player.start(); updateNotification(); } } @Override public void onPause() { if (player != null) { player.pause(); updateNotification(); } } @Override public void onSkipToNext() { playIndex(queueIndex + 1); } @Override public void onSkipToPrevious() { playIndex(queueIndex - 1); } @Override public void onStop() { stopPlayback(); } }); mediaSession.setActive(true); }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        String action = intent.getAction();
        if (ACTION_PLAY.equals(action)) { ArrayList<String> uris = intent.getStringArrayListExtra(EXTRA_QUEUE_URI); if (uris != null && !uris.isEmpty()) { queueUris.clear(); queueUris.addAll(uris); queueTitles.clear(); queueTitles.addAll(intent.getStringArrayListExtra(EXTRA_QUEUE_TITLE)); queueArtists.clear(); queueArtists.addAll(intent.getStringArrayListExtra(EXTRA_QUEUE_ARTIST)); queueIndex = intent.getIntExtra(EXTRA_QUEUE_INDEX, 0); } play(intent.getStringExtra(EXTRA_URI), intent.getStringExtra(EXTRA_TITLE), intent.getStringExtra(EXTRA_ARTIST)); }
        else if (ACTION_TOGGLE.equals(action)) toggle();
        else if (ACTION_STOP.equals(action)) stopPlayback();
        else if (ACTION_NEXT.equals(action)) playIndex(queueIndex + 1);
        else if (ACTION_PREVIOUS.equals(action)) playIndex(queueIndex - 1);
        else if (ACTION_SET_EQ.equals(action)) { equalizer.setEnabled(intent.getBooleanExtra("enabled", true)); equalizer.setBandGain(intent.getIntExtra("band", -1), intent.getFloatExtra("gainDb", 0)); }
        return START_STICKY;
    }

    private void play(String uri, String nextTitle, String nextArtist) {
        if (uri == null) return;
        releasePlayer();
        title = nextTitle == null ? "未知歌曲" : nextTitle;
        artist = nextArtist == null ? "未知艺人" : nextArtist;
        player = new MediaPlayer();
        try {
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            player.setDataSource(this, Uri.parse(uri));
            player.setOnPreparedListener(mp -> { equalizer.attach(mp.getAudioSessionId()); mp.start(); updateNotification(); });
            player.setOnCompletionListener(mp -> playIndex(queueIndex + 1));
            player.prepareAsync();
            startForeground(NOTIFICATION_ID, buildNotification(false));
        } catch (IOException | RuntimeException error) { releasePlayer(); stopSelf(); }
    }

    private void toggle() { if (player == null) return; if (player.isPlaying()) player.pause(); else player.start(); updateNotification(); }
    private void playIndex(int index) { if (queueUris.isEmpty()) { stopPlayback(); return; } if (index < 0 || index >= queueUris.size()) { stopPlayback(); return; } queueIndex = index; String nextTitle = index < queueTitles.size() ? queueTitles.get(index) : "未知歌曲"; String nextArtist = index < queueArtists.size() ? queueArtists.get(index) : "未知艺人"; play(queueUris.get(index), nextTitle, nextArtist); }
    private void stopPlayback() { releasePlayer(); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); }
    private void releasePlayer() { if (player != null) { try { player.stop(); } catch (IllegalStateException ignored) {} player.release(); player = null; } }

    private Notification buildNotification(boolean paused) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent content = PendingIntent.getActivity(this, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent toggle = new Intent(this, PlaybackService.class).setAction(ACTION_TOGGLE);
        PendingIntent togglePending = PendingIntent.getService(this, 2, toggle, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent stop = new Intent(this, PlaybackService.class).setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(this, 3, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        MediaMetadata metadata = new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE, title).putString(MediaMetadata.METADATA_KEY_ARTIST, artist).build();
        mediaSession.setMetadata(metadata);
        mediaSession.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_STOP).setState(paused ? PlaybackState.STATE_PAUSED : PlaybackState.STATE_PLAYING, player == null ? 0 : player.getCurrentPosition(), 1f).build());
        Intent next = new Intent(this, PlaybackService.class).setAction(ACTION_NEXT);
        PendingIntent nextPending = PendingIntent.getService(this, 4, next, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent previous = new Intent(this, PlaybackService.class).setAction(ACTION_PREVIOUS);
        PendingIntent previousPending = PendingIntent.getService(this, 5, previous, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        builder.setSmallIcon(android.R.drawable.ic_media_play).setContentTitle(title).setContentText(artist).setContentIntent(content).setOngoing(!paused).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_TRANSPORT).addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous, "上一首", previousPending).build()).addAction(new Notification.Action.Builder(paused ? android.R.drawable.ic_media_play : android.R.drawable.ic_media_pause, paused ? "播放" : "暂停", togglePending).build()).addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next, "下一首", nextPending).build()).addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "停止", stopPending).build());
        if (Build.VERSION.SDK_INT >= 21) builder.setStyle(new Notification.MediaStyle().setMediaSession(mediaSession.getSessionToken()).setShowActionsInCompactView(0));
        return builder.build();
    }

    private void updateNotification() { if (player != null) { boolean paused = !player.isPlaying(); ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, buildNotification(paused)); } }
    private void createChannel() { if (Build.VERSION.SDK_INT >= 26) { NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Mintune 播放控制", NotificationManager.IMPORTANCE_LOW); channel.setDescription("后台播放和锁屏控制"); ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel); } }
    @Override public void onDestroy() { equalizer.release(); if (mediaSession != null) { mediaSession.setActive(false); mediaSession.release(); } releasePlayer(); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
