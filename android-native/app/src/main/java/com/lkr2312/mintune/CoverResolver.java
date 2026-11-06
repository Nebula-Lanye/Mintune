package com.lkr2312.mintune;

import android.content.Context;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.net.Uri;

import java.io.File;

public final class CoverResolver {
    private CoverResolver() {}
    public static Bitmap embedded(Context context, String uriString) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try { retriever.setDataSource(context, Uri.parse(uriString)); byte[] picture = retriever.getEmbeddedPicture(); return picture == null ? null : android.graphics.BitmapFactory.decodeByteArray(picture, 0, picture.length); } catch (RuntimeException ignored) { return null; } finally { try { retriever.release(); } catch (java.io.IOException ignored) {} }
    }
    public static File sidecar(String audioPath) {
        if (audioPath == null) return null;
        File audio = new File(audioPath); File parent = audio.getParentFile(); if (parent == null) return null;
        String base = audio.getName().replaceFirst("\\.[^.]+$", ""); String[] names = {base + ".jpg", base + ".png", "cover.jpg", "cover.png", "folder.jpg", "folder.png", "AlbumArt.jpg", "AlbumArt.png"};
        for (String name : names) { File candidate = new File(parent, name); if (candidate.isFile()) return candidate; }
        return null;
    }
}
