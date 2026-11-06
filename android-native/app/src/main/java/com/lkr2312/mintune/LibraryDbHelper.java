package com.lkr2312.mintune;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.ArrayList;
import java.util.List;

public final class LibraryDbHelper extends SQLiteOpenHelper {
    private static final String DB_NAME = "mintune.db";
    private static final int DB_VERSION = 2;
    public LibraryDbHelper(Context context) { super(context, DB_NAME, null, DB_VERSION); }
    @Override public void onCreate(SQLiteDatabase db) { createTables(db); }
    private void createTables(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS tracks (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT UNIQUE NOT NULL, title TEXT, artist TEXT, album TEXT, duration INTEGER DEFAULT 0, modified INTEGER DEFAULT 0, cover_path TEXT, lrc_path TEXT)");
        db.execSQL("CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL, played_at INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE IF NOT EXISTS playlist_tracks (playlist_id INTEGER NOT NULL, track_uri TEXT NOT NULL, position INTEGER DEFAULT 0, PRIMARY KEY (playlist_id, track_uri))");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { if (oldVersion < 2) createTables(db); }
    public void upsert(String uri, String title, String artist, String album, long duration) { upsert(uri, title, artist, album, duration, 0, null, null); }
    public void upsert(String uri, String title, String artist, String album, long duration, long modified, String coverPath, String lrcPath) { ContentValues values = new ContentValues(); values.put("uri", uri); values.put("title", title); values.put("artist", artist); values.put("album", album); values.put("duration", duration); values.put("modified", modified); if (coverPath != null) values.put("cover_path", coverPath); if (lrcPath != null) values.put("lrc_path", lrcPath); getWritableDatabase().insertWithOnConflict("tracks", null, values, SQLiteDatabase.CONFLICT_REPLACE); }
    public List<Track> all() { List<Track> result = new ArrayList<>(); try (Cursor cursor = getReadableDatabase().query("tracks", null, null, null, null, null, "title COLLATE NOCASE ASC")) { while (cursor.moveToNext()) result.add(trackFrom(cursor)); } return result; }
    public boolean unchanged(String uri, long modified) { try (Cursor cursor = getReadableDatabase().query("tracks", new String[]{"modified"}, "uri=?", new String[]{uri}, null, null, null)) { return cursor.moveToFirst() && cursor.getLong(0) == modified; } }
    private Track trackFrom(Cursor c) { return new Track(c.getString(c.getColumnIndexOrThrow("uri")), c.getString(c.getColumnIndexOrThrow("title")), c.getString(c.getColumnIndexOrThrow("artist")), c.getString(c.getColumnIndexOrThrow("album")), c.getLong(c.getColumnIndexOrThrow("duration")), c.getString(c.getColumnIndexOrThrow("cover_path")), c.getString(c.getColumnIndexOrThrow("lrc_path"))); }
    public void addHistory(String uri) { ContentValues values = new ContentValues(); values.put("uri", uri); values.put("played_at", System.currentTimeMillis()); getWritableDatabase().insert("history", null, values); getWritableDatabase().execSQL("DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY played_at DESC LIMIT 200)"); }
    public long createPlaylist(String name) { ContentValues values = new ContentValues(); values.put("name", name); values.put("created_at", System.currentTimeMillis()); return getWritableDatabase().insertWithOnConflict("playlists", null, values, SQLiteDatabase.CONFLICT_IGNORE); }
    public void addToPlaylist(long playlistId, String uri, int position) { ContentValues values = new ContentValues(); values.put("playlist_id", playlistId); values.put("track_uri", uri); values.put("position", position); getWritableDatabase().insertWithOnConflict("playlist_tracks", null, values, SQLiteDatabase.CONFLICT_REPLACE); }
    public static final class Track { public final String uri, title, artist, album, coverPath, lrcPath; public final long duration; Track(String uri, String title, String artist, String album, long duration, String coverPath, String lrcPath) { this.uri = uri; this.title = title; this.artist = artist; this.album = album; this.duration = duration; this.coverPath = coverPath; this.lrcPath = lrcPath; } }
}
