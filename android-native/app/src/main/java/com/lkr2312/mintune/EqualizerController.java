package com.lkr2312.mintune;

import android.media.audiofx.Equalizer;

/** Maps Mintune's stable ten-band UI to the bands exposed by the Android audio device. */
public final class EqualizerController {
    private static final int BAND_COUNT = 10;
    private final short[] gainsMb = new short[BAND_COUNT];
    private Equalizer equalizer;
    private boolean enabled;

    public void attach(int audioSessionId) {
        release();
        try {
            equalizer = new Equalizer(0, audioSessionId);
            equalizer.setEnabled(enabled);
        } catch (RuntimeException ignored) { equalizer = null; }
    }

    public void setEnabled(boolean enabled) { this.enabled = enabled; if (equalizer != null) { try { equalizer.setEnabled(enabled); } catch (RuntimeException ignored) {} } }
    public boolean isEnabled() { return enabled; }
    public float[] getGainsDb() { float[] result = new float[BAND_COUNT]; for (int i = 0; i < BAND_COUNT; i++) result[i] = gainsMb[i] / 100f; return result; }
    public void setBandGain(int index, float gainDb) {
        if (index < 0 || index >= BAND_COUNT) return;
        gainsMb[index] = (short) Math.max(-1200, Math.min(1200, Math.round(gainDb * 100)));
        apply(index);
    }
    private void apply(int uiBand) {
        if (equalizer == null) return;
        try {
            short bands = equalizer.getNumberOfBands();
            if (bands <= 0) return;
            int nativeBand = Math.min(bands - 1, Math.round(uiBand * (bands - 1) / 9f));
            equalizer.setBandLevel((short) nativeBand, gainsMb[uiBand]);
        } catch (RuntimeException ignored) {}
    }
    public void reset() { for (int i = 0; i < BAND_COUNT; i++) { gainsMb[i] = 0; apply(i); } }
    public void release() { if (equalizer != null) { try { equalizer.release(); } catch (RuntimeException ignored) {} equalizer = null; } }
}
