import {
  clampGain,
  EQ_BAND_FREQUENCIES_HZ,
  getEqualizer,
} from "react-native-queue-player";

export { EQ_BAND_FREQUENCIES_HZ, clampGain };

let eq: ReturnType<typeof getEqualizer> | null = null;
function nativeEqualizer() {
  return eq ??= getEqualizer();
}
let initialized: Promise<void> | null = null;

export const Equalizer = {
  init() {
    if (!initialized) {
      initialized = Promise.resolve().then(async () => {
        await nativeEqualizer().setEnabled(false);
        await nativeEqualizer().reset();
      });
    }
    return initialized;
  },
  async setEnabled(enabled: boolean) {
    await this.init();
    await nativeEqualizer().setEnabled(enabled);
  },
  isEnabled() {
    return nativeEqualizer().isEnabled();
  },
  async setBandGain(index: number, gain: number) {
    await this.init();
    await nativeEqualizer().setBandGain(index, clampGain(gain));
  },
  async setAllBandGains(gains: number[]) {
    await this.init();
    await nativeEqualizer().setAllBandGains(gains.slice(0, EQ_BAND_FREQUENCIES_HZ.length).map(clampGain));
  },
  async setPreset(name: string) {
    await this.init();
    await nativeEqualizer().applyPreset(name);
  },
  async reset() {
    await this.init();
    await nativeEqualizer().reset();
  },
  getBands() {
    return nativeEqualizer().getBands();
  },
  getPresets() {
    return nativeEqualizer().getPresets();
  },
};
