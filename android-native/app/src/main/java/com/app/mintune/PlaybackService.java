package com.app.mintune;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;

import java.io.IOException;

public final class PlaybackService extends Service {
    public static final String ACTION_PLAY = "com.app.mintune.PLAY";
    public static final String ACTION_TOGGLE = "com.app.mintune.TOGGLE";
    public static final String ACTION_STOP = "com.app.mintune.STOP";
    public static final String EXTRA_URI = "uri";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    private static final String CHANNEL_ID = "mintune_playback";
    private static final int NOTIFICATION_ID = 4805;
    private MediaPlayer player;
    private String title = "Mintune";
    private String artist = "本地音乐";

    @Override public void onCreate() { super.onCreate(); createChannel(); }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        String action = intent.getAction();
        if (ACTION_PLAY.equals(action)) play(intent.getStringExtra(EXTRA_URI), intent.getStringExtra(EXTRA_TITLE), intent.getStringExtra(EXTRA_ARTIST));
        else if (ACTION_TOGGLE.equals(action)) toggle();
        else if (ACTION_STOP.equals(action)) stopPlayback();
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
            player.setOnPreparedListener(mp -> { mp.start(); updateNotification(); });
            player.setOnCompletionListener(mp -> stopPlayback());
            player.prepareAsync();
            startForeground(NOTIFICATION_ID, buildNotification(false));
        } catch (IOException | RuntimeException error) { releasePlayer(); stopSelf(); }
    }

    private void toggle() { if (player == null) return; if (player.isPlaying()) player.pause(); else player.start(); updateNotification(); }
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
        builder.setSmallIcon(android.R.drawable.ic_media_play).setContentTitle(title).setContentText(artist).setContentIntent(content).setOngoing(!paused).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_TRANSPORT).addAction(new Notification.Action.Builder(paused ? android.R.drawable.ic_media_play : android.R.drawable.ic_media_pause, paused ? "播放" : "暂停", togglePending).build()).addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "停止", stopPending).build());
        return builder.build();
    }

    private void updateNotification() { if (player != null) { boolean paused = !player.isPlaying(); ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, buildNotification(paused)); } }
    private void createChannel() { if (Build.VERSION.SDK_INT >= 26) { NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Mintune 播放控制", NotificationManager.IMPORTANCE_LOW); channel.setDescription("后台播放和锁屏控制"); ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel); } }
    @Override public void onDestroy() { releasePlayer(); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
