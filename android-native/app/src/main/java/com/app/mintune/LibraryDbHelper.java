package com.app.mintune;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.ArrayList;
import java.util.List;

public final class LibraryDbHelper extends SQLiteOpenHelper {
    private static final String DB_NAME = "mintune.db";
    private static final int DB_VERSION = 1;

    public LibraryDbHelper(Context context) { super(context, DB_NAME, null, DB_VERSION); }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE tracks (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT UNIQUE NOT NULL, title TEXT, artist TEXT, album TEXT, duration INTEGER DEFAULT 0)");
    }

    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { }

    public void upsert(String uri, String title, String artist, String album, long duration) {
        ContentValues values = new ContentValues();
        values.put("uri", uri); values.put("title", title); values.put("artist", artist); values.put("album", album); values.put("duration", duration);
        getWritableDatabase().insertWithOnConflict("tracks", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    public List<Track> all() {
        List<Track> result = new ArrayList<>();
        try (Cursor cursor = getReadableDatabase().query("tracks", null, null, null, null, null, "title COLLATE NOCASE ASC")) {
            while (cursor.moveToNext()) result.add(new Track(cursor.getString(cursor.getColumnIndexOrThrow("uri")), cursor.getString(cursor.getColumnIndexOrThrow("title")), cursor.getString(cursor.getColumnIndexOrThrow("artist")), cursor.getString(cursor.getColumnIndexOrThrow("album")), cursor.getLong(cursor.getColumnIndexOrThrow("duration"))));
        }
        return result;
    }

    public static final class Track {
        public final String uri, title, artist, album; public final long duration;
        Track(String uri, String title, String artist, String album, long duration) { this.uri = uri; this.title = title; this.artist = artist; this.album = album; this.duration = duration; }
    }
}
